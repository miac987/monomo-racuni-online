function clientView(){
  return `
    <h1>Naročniki</h1>

    <div class="panel three">

      <label>
        Naziv
        <input id="cn">
      </label>

      <label>
        Kontaktna oseba
        <input id="cc">
      </label>

      <label>
        E-pošta
        <input id="ce">
      </label>

      <label>
        Naslov
        <input id="ca">
      </label>

      <label>
        Pošta in kraj
        <input id="cp">
      </label>

      <label>
        Davčna / ID za DDV
        <input id="ct">
      </label>

      <label>
        Naslov za račun (če je drugačen)
        <input id="cba">
      </label>

      <label>
        Pošta za račun
        <input id="cbp">
      </label>

      <label>
        Privzeti rok plačila
        <select id="cd">
          <option value="8">8 dni</option>
          <option value="30">30 dni</option>
        </select>
      </label>

      <label>
        Privzeta osnova sodelovanja
        <select id="cbasis">
          <option>Pogodba</option>
          <option>Naročilnica</option>
          <option selected>Po dogovoru</option>
          <option>Drugo</option>
        </select>
      </label>

      <button
        class="primary"
        onclick="addClient()"
      >
        Dodaj naročnika
      </button>

    </div>

    <div class="table">

      <div class="tr head">
        <span>Naziv</span>
        <span>Naslov</span>
        <span>Osnova</span>
        <span>Rok</span>
        <span>Projekti / dejanja</span>
      </div>

      ${clients.map(c=>`
        <div class="tr">

          <span>
            ${esc(c.name)}
          </span>

          <span>
            ${esc(c.address)} · ${esc(c.postal)}
          </span>

          <span>
            ${esc(c.default_basis||'Po dogovoru')}
          </span>

          <span>
            ${c.payment_days} dni
          </span>

          <span class="actions">

            <span>
              ${projects.filter(p=>p.client_id===c.id).length} projektov
            </span>

            <button onclick="newProjectFor('${c.id}')">
              + Projekt
            </button>

            <button onclick="delClient('${c.id}')">
              Izbriši
            </button>

          </span>

        </div>
      `).join('')}

    </div>
  `
}


async function addClient(){

  let row={
    user_id:user.id,
    name:$('#cn').value,
    address:$('#ca').value,
    postal:$('#cp').value,
    tax:$('#ct').value,
    email:$('#ce').value,
    contact_person:$('#cc').value,
    billing_address:$('#cba').value,
    billing_postal:$('#cbp').value,
    payment_days:+$('#cd').value,
    default_basis:$('#cbasis').value
  };

  if(!row.name)return;

  let{error}=await sb
    .from('clients')
    .insert(row);

  if(error){
    alert(error.message)
  }else{
    await load()
  }
}


async function delClient(id){

  if(!confirm('Izbrišem naročnika?'))return;

  let{error}=await sb
    .from('clients')
    .delete()
    .eq('id',id);

  if(error){
    alert('Naročnika z dokumenti ali projekti ni mogoče izbrisati.')
  }else{
    await load()
  }
}


function newProjectFor(clientId){

  view='projects';
  render();

  setTimeout(()=>{

    let x=$('#pc');

    if(x){
      x.value=clientId;
      projectClientChanged()
    }

  },0)
}


function projectClientChanged(){

  let cl=client($('#pc').value),
      basis=$('#pbasis');

  if(basis&&cl?.default_basis){
    basis.value=cl.default_basis
  }

  projectBasisChanged()
}


function projectBasisChanged(){

  let v=$('#pbasis')?.value||'Po dogovoru',
      contract=$('#projectContractFields'),
      order=$('#projectOrderFields'),
      other=$('#projectOtherField');

  if(contract){
    contract.style.display=
      v==='Pogodba'
        ?'contents'
        :'none'
  }

  if(order){
    order.style.display=
      v==='Naročilnica'
        ?'contents'
        :'none'
  }

  if(other){
    other.style.display=
      v==='Drugo'
        ?'grid'
        :'none'
  }
}


function projectFeeInputs(scope,phases){

  return `
    <div
      style="
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;
        margin-top:12px;
      "
    >

      ${phases.map((phase,index)=>`

        <label>

          ${phase}

          <input
            type="number"
            step=".01"
            min="0"
            class="projectFeeInput"
            data-scope="${esc(scope)}"
            data-phase="${esc(phase)}"
            data-order="${index}"
            placeholder="—"
            oninput="updateProjectFeeTotal()"
          >

        </label>

      `).join('')}

    </div>
  `
}


function updateProjectFeeTotal(){

  let total=0;

  document
    .querySelectorAll('.projectFeeInput')
    .forEach(input=>{

      if(input.value!==''){
        total+=num(input.value)
      }

    });

  let out=$('#projectFeeTotal');

  if(out){
    out.value=fmt(total)
  }

  return total
}


function collectProjectFeeItems(){

  let rows=[];

  document
    .querySelectorAll('.projectFeeInput')
    .forEach((input,index)=>{

      let raw=input.value.trim();

      if(raw==='')return;

      let value=num(raw);

      if(value<=0)return;

      rows.push({
        scope:input.dataset.scope,
        phase:input.dataset.phase,
        agreed_value:value,
        sort_order:index
      })

    });

  return rows
}


function projectFeeTotal(projectId){

  return feeItems
    .filter(x=>x.project_id===projectId)
    .reduce(
      (sum,x)=>sum+num(x.agreed_value),
      0
    )
}


function projectView(){

  let first=clients[0],
      defaultBasis=first?.default_basis||'Po dogovoru';

  return `

    <h1>Projekti</h1>

    <p class="muted">
      Projekt povezuje naročnika, osnovo sodelovanja,
      pogodbene faze in račune.
      Pogodbene vrednosti so interna evidenca in se ne
      izpisujejo na PDF.
    </p>


    <div class="panel three">

      <label>
        Naročnik

        <select
          id="pc"
          onchange="projectClientChanged()"
        >

          ${clients.map(c=>`
            <option value="${c.id}">
              ${esc(c.name)}
            </option>
          `).join('')}

        </select>
      </label>


      <label>
        Št. projekta
        <input
          id="pno"
          placeholder="npr. 16-2024"
        >
      </label>


      <label>
        Naziv projekta
        <input id="pn">
      </label>


      <label>
        Osnova sodelovanja

        <select
          id="pbasis"
          onchange="projectBasisChanged()"
        >

          <option
            ${defaultBasis==='Pogodba'?'selected':''}
          >
            Pogodba
          </option>

          <option
            ${defaultBasis==='Naročilnica'?'selected':''}
          >
            Naročilnica
          </option>

          <option
            ${defaultBasis==='Po dogovoru'?'selected':''}
          >
            Po dogovoru
          </option>

          <option
            ${defaultBasis==='Drugo'?'selected':''}
          >
            Drugo
          </option>

        </select>
      </label>


      <span
        id="projectContractFields"
        style="
          display:${defaultBasis==='Pogodba'?'contents':'none'}
        "
      >

        <label>
          Št. pogodbe
          <input id="pcon">
        </label>

        <label>
          Datum pogodbe
          <input
            id="pcd"
            type="date"
          >
        </label>

      </span>


      <span
        id="projectOrderFields"
        style="
          display:${defaultBasis==='Naročilnica'?'contents':'none'}
        "
      >

        <label>
          Št. naročilnice
          <input id="por">
        </label>

        <label>
          Datum naročilnice
          <input
            id="pord"
            type="date"
          >
        </label>

      </span>


      <label
        id="projectOtherField"
        style="
          display:${defaultBasis==='Drugo'?'grid':'none'}
        "
      >
        Drugo – opis

        <input
          id="pother"
          placeholder="npr. ustni dogovor, okvirni dogovor ..."
        >

      </label>


      <label>
        Status

        <select id="ps">
          <option>Aktiven</option>
          <option>Zaključen</option>
        </select>

      </label>


      <label style="grid-column:1/-1">

        Interne opombe

        <textarea
          id="pnotes"
          rows="2"
        ></textarea>

      </label>


      <div
        style="
          grid-column:1/-1;
          margin-top:8px;
          border-top:1px solid #e5e5e5;
          padding-top:18px;
        "
      >

        <h2 style="margin-top:0">
          Pogodbene vrednosti po fazah
        </h2>

        <p class="muted">
          Vpiši samo faze, ki so predmet pogodbe,
          naročilnice ali dogovora.
          Prazne faze se ne upoštevajo.
        </p>


        <div
          style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:28px;
            align-items:start;
          "
        >

          <div>

            <b>Objekt</b>

            <div class="small muted">
              UP · IDP · DPP · DGD · PID · PN · Svetovanje
            </div>

            ${projectFeeInputs(
              'Objekt',
              OBJECT_PHASES
            )}

          </div>


          <div>

            <b>Notranja oprema</b>

            <div class="small muted">
              IDP · PZI · PN · Svetovanje
            </div>

            ${projectFeeInputs(
              'Notranja oprema',
              INTERIOR_PHASES
            )}

          </div>

        </div>


        <div
          style="
            display:flex;
            justify-content:flex-end;
            align-items:center;
            gap:14px;
            margin-top:22px;
            padding-top:15px;
            border-top:1px solid #eeeeee;
          "
        >

          <b>
            POGODBENA VREDNOST SKUPAJ
          </b>

          <input
            id="projectFeeTotal"
            value="0,00 €"
            readonly
            style="
              max-width:170px;
              text-align:right;
              font-weight:700;
              font-size:16px;
            "
          >

        </div>

      </div>


      <button
        class="primary"
        onclick="addProject()"
      >
        Dodaj projekt
      </button>

    </div>


    <div class="panel">

      <h2>
        Seznam projektov
      </h2>

      ${
        projects
          .map(p=>projectLine(p))
          .join('')
        ||
        '<p class="muted">Ni projektov.</p>'
      }

    </div>
  `
}


function projectLine(p){

  let cl=client(p.client_id),

      inv=docs.filter(
        d=>
          d.project_id===p.id&&
          d.doc_type==='invoice'
      ),

      fact=inv.reduce(
        (a,d)=>
          a+
          calc(
            d.items,
            d.vat_mode,
            company().vat_registered
          ).net,
        0
      ),

      disc=inv.reduce(
        (a,d)=>
          a+
          calc(
            d.items,
            d.vat_mode,
            company().vat_registered
          ).discount,
        0
      ),

      agreed=projectFeeTotal(p.id),

      basis=p.basis_type||'Po dogovoru',

      basisText=
        basis==='Pogodba'
          ?
            (
              p.contract_no
                ?
                  'Pogodba '+esc(p.contract_no)
                :
                  'Pogodba'
            )
        :
        basis==='Naročilnica'
          ?
            (
              p.order_no
                ?
                  'Naročilnica '+esc(p.order_no)
                :
                  'Naročilnica'
            )
        :
        basis==='Drugo'
          ?
            (
              p.basis_other
                ?
                  esc(p.basis_other)
                :
                  'Drugo'
            )
        :
          'Po dogovoru';


  return `

    <div class="projectCard">

      <div>

        <b>
          ${esc(p.project_no)}
        </b>

        <div class="small muted">
          ${esc(p.name)}
        </div>

      </div>


      <div>
        ${esc(cl?.name||'')}
      </div>


      <div class="small">

        Dogovorjeno:
        <b>
          ${fmt(agreed)}
        </b>

        <br>

        Fakturirano:
        <b>
          ${fmt(fact)}
        </b>

        ${
          disc
            ?
            `
              <br>
              Popusti:
              ${fmt(disc)}
            `
            :
            ''
        }

      </div>


      <div class="small">
        ${basisText}
      </div>


      <div class="actions">

        <button
          onclick="addAddendum('${p.id}')"
        >
          + Aneks
        </button>

        <button
          onclick="delProject('${p.id}')"
        >
          Izbriši
        </button>

      </div>

    </div>
  `
}


async function addProject(){

  let basis=$('#pbasis').value,

      fees=collectProjectFeeItems(),

      total=fees.reduce(
        (sum,x)=>sum+num(x.agreed_value),
        0
      ),

      row={
        user_id:user.id,
        client_id:$('#pc').value,

        project_no:
          $('#pno').value.trim(),

        name:
          $('#pn').value.trim(),

        basis_type:basis,

        basis_other:
          basis==='Drugo'
            ?
              ($('#pother')?.value||'').trim()
            :
              '',

        contract_no:
          basis==='Pogodba'
            ?
              ($('#pcon')?.value||'').trim()
            :
              '',

        contract_date:
          basis==='Pogodba'
            ?
              ($('#pcd')?.value||null)
            :
              null,

        order_no:
          basis==='Naročilnica'
            ?
              ($('#por')?.value||'').trim()
            :
              '',

        order_date:
          basis==='Naročilnica'
            ?
              ($('#pord')?.value||null)
            :
              null,

        contract_value:
          total>0
            ?
              total
            :
              null,

        status:
          $('#ps').value,

        notes:
          $('#pnotes').value
      };


  if(!row.project_no){
    return alert(
      'Vpiši številko projekta.'
    )
  }


  let{
    data,
    error
  }=await sb
    .from('projects')
    .insert(row)
    .select('id')
    .single();


  if(error){
    alert(error.message);
    return
  }


  if(fees.length){

    let feeRows=fees.map(
      (x,index)=>({
        user_id:user.id,
        project_id:data.id,
        scope:x.scope,
        phase:x.phase,
        agreed_value:x.agreed_value,
        sort_order:index,
        is_closed:false
      })
    );


    let{
      error:feeError
    }=await sb
      .from('project_fee_items')
      .insert(feeRows);


    if(feeError){

      await sb
        .from('projects')
        .delete()
        .eq('id',data.id);

      alert(
        'Projekt ni bil shranjen, ker pogodbenih faz ni bilo mogoče shraniti: '+
        feeError.message
      );

      return
    }
  }


  await load()
}


async function addAddendum(projectId){

  let no=prompt(
    'Številka aneksa:'
  );

  if(no===null)return;


  let dt=prompt(
    'Datum aneksa (LLLL-MM-DD):',
    ''
  );


  let{error}=await sb
    .from('project_addenda')
    .insert({
      user_id:user.id,
      project_id:projectId,
      addendum_no:no,
      addendum_date:dt||null
    });


  if(error){
    alert(error.message)
  }else{
    await load()
  }
}


async function delProject(id){

  if(!confirm('Izbrišem projekt?')){
    return
  }


  let hasDocuments=docs.some(
    d=>d.project_id===id
  );


  if(hasDocuments){

    alert(
      'Projekta ni mogoče izbrisati, ker so nanj že vezani računi ali predračuni.'
    );

    return
  }


  let{
    error:feeError
  }=await sb
    .from('project_fee_items')
    .delete()
    .eq('project_id',id);


  if(feeError){
    alert(feeError.message);
    return
  }


  let{error}=await sb
    .from('projects')
    .delete()
    .eq('id',id);


  if(error){
    alert(error.message)
  }else{
    await load()
  }
}
