// Dumps the scenario data of the design prototype to prototype_data.json by evaluating its script in a VM
// with a stub DOM. Run: node lib/scenarios/extract_prototype.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const HTML = '/Users/michaelolorunnisola/Dev/kibana/unified-investigation-poc/reference/unified_investigation_view.html';
const html = fs.readFileSync(HTML, 'utf8');
const start = html.indexOf('<script>') + '<script>'.length;
const end = html.lastIndexOf('</script>');
let src = html.slice(start, end);

const tail = "loadScenario('B');\nrender();\n})();";
if (!src.includes(tail)) throw new Error('prototype tail not found');
src = src.replace(
  tail,
  `__api({loadScenario:loadScenario,get:function(){return {S:S,SC:SC,EV:EV,ARG:ARG,GN:GN,GE:GE,GPOS:GPOS,SIM:SIM,SIMD:SIMD,PCHIPS:PCHIPS,REVS:REVS,PMAP:PMAP,WHO:WHO,NOW:NOW,secEvents:secEvents,propArg:propArg,tplFull:tplFull};}});\n})();`
);

const makeStub = () => {
  const fn = function () {};
  const proxy = new Proxy(fn, {
    get: (_t, prop) => (prop === Symbol.toPrimitive ? () => '' : prop === 'length' ? 0 : proxy),
    set: () => true,
    apply: () => proxy,
    construct: () => proxy,
  });
  return proxy;
};
const stub = makeStub();
let api;
const sandbox = {
  document: stub,
  window: stub,
  localStorage: stub,
  navigator: stub,
  location: stub,
  setTimeout: () => 0,
  clearTimeout: () => {},
  setInterval: () => 0,
  requestAnimationFrame: () => 0,
  console,
  Date,
  JSON,
  Math,
  __api: (a) => {
    api = a;
  },
};
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'prototype.js' });

const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'function' ? undefined : v instanceof RegExp ? String(v) : v)));

const out = { scenarios: {} };
for (const id of ['A', 'B', 'C', 'D', 'E']) {
  api.loadScenario(id);
  const g = api.get();
  const sec = g.SC.sec();
  const SCmeta = { ...g.SC };
  const scenario = {
    sc: strip({ ...SCmeta, narrative: undefined }),
    ev: strip(g.EV),
    arg: strip(g.ARG),
    gn: strip(g.GN),
    ge: strip(g.GE),
    gpos: strip(g.GPOS),
    sim: strip(g.SIM),
    simd: strip(g.SIMD),
    sec: strip(sec),
    chips: strip(g.PCHIPS),
    state: strip({
      tasks: g.S.tasks,
      claims: g.S.claims,
      propData: g.S.propData,
      props: g.S.props,
      rej: g.S.rej,
      pdec: g.S.pdec,
      owner: g.S.owner,
      status: g.S.status,
      analyst: g.S.analyst,
      closed: g.S.closed,
      msgs: g.S.msgs,
      threads: g.S.threads,
      log: g.S.log,
      cm: g.S.cm,
      fields: g.S.fields,
      procType: g.S.procType,
    }),
    propArgs: {},
  };
  // Pre-compute fallback proposal arguments (propArg) for each proposal.
  for (const pk of Object.keys(g.S.propData)) {
    if (!(g.PMAP[pk] && g.ARG[g.PMAP[pk]])) scenario.propArgs[pk] = strip(g.propArg(pk));
  }
  scenario.pmap = strip(g.PMAP);
  out.scenarios[id] = scenario;
}
out.who = strip(api.get().WHO);
fs.writeFileSync(path.join(here, 'prototype_data.json'), JSON.stringify(out, null, 1));
console.log('wrote prototype_data.json', Object.fromEntries(Object.entries(out.scenarios).map(([k, v]) => [k, { ev: v.ev.length, claims: v.state.claims.length, tasks: v.state.tasks.length, log: v.state.log.length, gn: v.gn.length, ge: v.ge.length, sec: v.sec.length }])));
