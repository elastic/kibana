/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Single-file UI for browsing a campaign.
 *
 * Kept as a template string rather than a bundled app on purpose: the report has to be openable
 * from any machine, months later, with no build step and no server — including by someone who
 * only has the HTML file.
 */
export const reportTemplate = (payload: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>ES|QL harness optimization</title>
<style>
:root { color-scheme: dark; --bg:#0b0f14; --panel:#141b23; --panel2:#1b242e; --line:#2a3744;
        --fg:#e6edf3; --muted:#90a4b7; --good:#46d17d; --bad:#ff6b63; --warn:#e3b341; --accent:#6cb6ff; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--fg);
       font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace; }
a { color:var(--accent); }
header { display:flex; align-items:center; gap:20px; padding:12px 20px; border-bottom:1px solid var(--line); }
header h1 { font-size:14px; margin:0; letter-spacing:.04em; text-transform:uppercase; }
header .tabs { display:flex; gap:4px; margin-left:auto; }
header button { background:var(--panel); color:var(--fg); border:1px solid var(--line); border-radius:6px;
                padding:5px 12px; cursor:pointer; font:inherit; }
header button.active { background:var(--accent); color:#06121f; border-color:var(--accent); }
main { padding:18px 20px 60px; max-width:1500px; }
h2 { font-size:15px; margin:0 0 4px; }
h3 { font-size:13px; margin:22px 0 6px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; }
.muted { color:var(--muted); }
.good { color:var(--good); } .bad { color:var(--bad); } .warn { color:var(--warn); }
table { border-collapse:collapse; width:100%; margin:8px 0 10px; }
th,td { text-align:left; padding:6px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
th { color:var(--muted); font-weight:500; white-space:nowrap; cursor:pointer; }
tbody tr:hover { background:var(--panel); }
pre { background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:9px 11px;
      white-space:pre-wrap; word-break:break-word; margin:4px 0; }
.cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin:10px 0 4px; }
.card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:9px 12px; }
.card .k { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.05em; }
.card .v { font-size:17px; margin-top:2px; }
.pill { display:inline-block; padding:1px 8px; border-radius:999px; border:1px solid var(--line); font-size:11px; }
.pill.good { border-color:var(--good); } .pill.bad { border-color:var(--bad); }
.timeline { display:flex; gap:10px; overflow-x:auto; padding:6px 0 12px; }
.node { min-width:190px; background:var(--panel); border:1px solid var(--line); border-left:3px solid var(--line);
        border-radius:8px; padding:10px 12px; cursor:pointer; }
.node.accepted { border-left-color:var(--good); } .node.rejected { border-left-color:var(--bad); }
.node:hover { background:var(--panel2); }
.gnode { cursor:pointer; } .gnode:hover rect:first-of-type { fill:#1b242e; }
.split { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.diff-add { background:rgba(70,209,125,.12); border-left:2px solid var(--good); padding-left:6px; }
.diff-del { background:rgba(255,107,99,.12); border-left:2px solid var(--bad); padding-left:6px; }
.bar { height:6px; border-radius:3px; background:var(--panel2); overflow:hidden; min-width:60px; }
.bar > div { height:100%; background:var(--accent); }
input[type=search], select { background:var(--panel); border:1px solid var(--line); color:var(--fg);
       border-radius:6px; padding:5px 9px; font:inherit; }
.toolbar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:8px 0; }
details > summary { cursor:pointer; color:var(--accent); }
.back { cursor:pointer; color:var(--accent); }
code { background:var(--panel2); padding:1px 5px; border-radius:4px; }
</style>
</head>
<body>
<header>
  <h1>ES|QL harness optimization</h1>
  <span class="muted" id="subtitle"></span>
  <div class="tabs" id="tabs"></div>
</header>
<main id="view"></main>
<script id="payload" type="application/json">${payload}</script>
<script>
const DATA = JSON.parse(document.getElementById('payload').textContent);
const el = document.getElementById('view');
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n = (v, d = 3) => (typeof v === 'number' && isFinite(v) ? v.toFixed(d) : '—');
const usd = (v) => (typeof v === 'number' && isFinite(v) ? '$' + v.toFixed(4) : '—');
const pct = (v) => (typeof v === 'number' ? Math.round(v * 100) + '%' : '—');
/** Attribute carrying a route, quoted with entities so no backslash escaping is needed. */
// Show paths relative to the tool directory; the absolute prefix is noise in every row.
// Built with RegExp() rather than a literal: this file is a template string, and a backslash in
// a regex literal is eaten before the browser ever sees it.
const PATH_PREFIX = new RegExp('[^ ]*generate_esql/', 'g');
const shortPath = (path) => String(path).split('generate_esql/').pop();
const stripPaths = (text) => String(text).replace(PATH_PREFIX, '');
const goAttr = (route) => 'data-go="' + esc(JSON.stringify(route)) + '"';
const sign = (v, d = 3) => (typeof v === 'number' ? (v >= 0 ? '+' : '') + v.toFixed(d) : '—');
const cls = (v) => (v > 0.001 ? 'good' : v < -0.001 ? 'bad' : 'muted');

document.getElementById('subtitle').textContent =
  DATA.rounds.length + ' rounds · ' + DATA.runs.length + ' runs · ' + DATA.exampleCount +
  ' examples · rendered ' + DATA.generatedAt.replace('T', ' ').slice(0, 19);

/* ---------------------------------------------------------------- routing */
const TABS = [
  ['campaign', 'Campaign'],
  ['rounds', 'Rounds'],
  ['runs', 'Runs'],
  ['examples', 'Examples'],
  ['dataset', 'Dataset'],
];
let route = { tab: 'campaign' };

const tabs = document.getElementById('tabs');
TABS.forEach(([id, label]) => {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = () => go({ tab: id });
  b.dataset.tab = id;
  tabs.appendChild(b);
});

function go(next) {
  route = { ...next };
  [...tabs.children].forEach((b) => b.classList.toggle('active', b.dataset.tab === route.tab));
  render();
}

function render() {
  const fn = { campaign: viewCampaign, rounds: viewRounds, runs: viewRuns,
               examples: viewExamples, dataset: viewDataset }[route.tab];
  el.innerHTML = fn();
  el.querySelectorAll('[data-go]').forEach((node) => {
    node.onclick = () => go(JSON.parse(node.dataset.go));
  });
  el.querySelectorAll('[data-sort]').forEach((node) => {
    node.onclick = () => { route.sort = node.dataset.sort; render(); };
  });
  const filter = el.querySelector('#filter');
  if (filter) {
    filter.oninput = () => { route.q = filter.value; const at = filter.selectionStart; render();
      const f = el.querySelector('#filter'); f.focus(); f.setSelectionRange(at, at); };
  }
  const sel = el.querySelector('#provenance');
  if (sel) sel.onchange = () => { route.provenance = sel.value; render(); };
}

/* ------------------------------------------------------------- components */
const cards = (entries) => '<div class="cards">' + entries
  .map(([k, v, c]) => '<div class="card"><div class="k">' + k + '</div><div class="v ' + (c || '') + '">' + v + '</div></div>')
  .join('') + '</div>';

const verdict = (round) => round.rejectedReason
  ? '<span class="pill bad">' + esc(round.rejectedReason) + '</span>'
  : round.gate
    ? (round.gate.accepted
        ? '<span class="pill good">accepted · ' + esc(round.gate.acceptedVia) + '</span>'
        : '<span class="pill bad">rejected</span>')
    : '<span class="pill">no gate</span>';

/** Colourised unified diff: the edit *is* the variant, so this is the primary artifact. */
const renderDiff = (diff, files) => {
  if (!diff) return '<p class="muted">No diff recorded.</p>';
  const body = diff.split(String.fromCharCode(10)).map((line) => {
    const cls = line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ')
      ? 'muted'
      : line.startsWith('+') ? 'good' : line.startsWith('-') ? 'bad'
      : line.startsWith('@@') ? 'accent' : '';
    return '<span class="' + cls + '">' + esc(line) + '</span>';
  }).join(String.fromCharCode(10));
  return '<p class="muted">' + (files || []).map(esc).join(', ') + '</p><pre>' + body + '</pre>';
};

/* ------------------------------------------------------------ lineage graph */
/**
 * The campaign is a tree of configs, not a list of rounds: every candidate is proposed *from*
 * some incumbent, and only an accepted one becomes the parent of the next generation. Rejected
 * candidates stay as leaves hanging off the config they were tried on, which is what makes
 * "what did we already try from here, and what happened" readable at a glance.
 */
function lineageGraph() {
  const nodes = new Map();
  nodes.set(DATA.baseHash, {
    id: DATA.baseHash, label: 'start', sub: 'tool as of ' + DATA.baseHash, parent: null,
    state: 'base', round: null, delta: null, cost: null, hash: DATA.baseHash,
  });

  const campaigns = [...new Set(DATA.rounds.map((round) => round.campaignId))];
  DATA.rounds.forEach((round) => {
    if (round.rejectedReason && !round.gate) {
      nodes.set('failed-' + round.round, {
        id: 'failed-' + round.round, label: 'round ' + round.round,
        sub:
          round.rejectedReason +
          ((round.failures || [])[0]
            ? ': ' + stripPaths((round.failures || [])[0]).slice(0, 40)
            : ''), parent: round.parentHash, state: 'failed',
        round: round.round, delta: null, cost: null,
      });
      return;
    }
    nodes.set(round.configHash + '-' + round.round, {
      id: round.configHash + '-' + round.round,
      label: 'round ' + round.round,
      sub: (round.slots || []).map(shortPath).join(', ') || 'edit',
      parent: round.parentHash,
      state: round.gate && round.gate.accepted ? 'accepted' : 'rejected',
      round: round.round,
      delta: round.gate ? round.gate.meanDelta : null,
      cost: round.gate ? round.gate.costRatio : null,
      hash: round.configHash,
    });
  });

  // An accepted candidate *is* the next incumbent, so children attach to its config hash.
  const byHash = new Map();
  nodes.forEach((node) => { if (node.hash) byHash.set(node.hash, node.id); });
  nodes.forEach((node) => {
    if (!node.parent) return;
    // Children attach to the *node* whose variant hash they branched from: an accepted
    // candidate is the next incumbent, so later rounds hang off it rather than off start.
    node.parentId = byHash.has(node.parent) ? byHash.get(node.parent) : DATA.baseHash;
  });

  // depth = generation; siblings are stacked vertically within their generation
  const depthOf = (node, guard = 0) =>
    !node.parentId || guard > 20 ? 0 : depthOf(nodes.get(node.parentId), guard + 1) + 1;
  const list = [...nodes.values()].map((node) => ({ ...node, depth: depthOf(node) }));
  const byDepth = new Map();
  list.forEach((node) => { byDepth.set(node.depth, [...(byDepth.get(node.depth) || []), node]); });

  const W = 230, H = 74, GX = 70, GY = 18;
  const position = new Map();
  [...byDepth.keys()].sort((a, b) => a - b).forEach((depth) => {
    byDepth.get(depth).sort((a, b) => (a.round ?? -1) - (b.round ?? -1)).forEach((node, index) => {
      position.set(node.id, { x: 10 + depth * (W + GX), y: 10 + index * (H + GY) });
    });
  });

  const width = 20 + ([...byDepth.keys()].length) * (W + GX);
  const height = 20 + Math.max(...[...byDepth.values()].map((group) => group.length)) * (H + GY);

  const edges = list.filter((node) => node.parentId).map((node) => {
    const from = position.get(node.parentId), to = position.get(node.id);
    if (!from || !to) return '';
    const x1 = from.x + W, y1 = from.y + H / 2, x2 = to.x, y2 = to.y + H / 2;
    const mid = (x1 + x2) / 2;
    return '<path d="M' + x1 + ',' + y1 + ' C' + mid + ',' + y1 + ' ' + mid + ',' + y2 + ' ' + x2 + ',' + y2 +
      '" fill="none" stroke="' + (node.state === 'accepted' ? '#46d17d' : '#2a3744') +
      '" stroke-width="' + (node.state === 'accepted' ? 2 : 1.2) + '"/>';
  }).join('');

  const colour = { base: '#6cb6ff', accepted: '#46d17d', rejected: '#ff6b63', failed: '#e3b341' };
  const boxes = list.map((node) => {
    const p = position.get(node.id);
    const stroke = colour[node.state];
    const deltaText = node.delta === null ? '' : sign(node.delta) + ' reward' +
      (node.cost ? ' · ' + node.cost.toFixed(2) + '× cost' : '');
    return '<g class="gnode" ' + (node.round !== null ? goAttr({ tab: 'rounds', round: node.round }) : '') + ' transform="translate(' + p.x + ',' + p.y + ')">' +
      '<rect width="' + W + '" height="' + H + '" rx="9" fill="#141b23" stroke="' + stroke + '" stroke-width="1.5"/>' +
      '<rect width="4" height="' + H + '" rx="2" fill="' + stroke + '"/>' +
      '<text x="14" y="22" fill="#e6edf3" font-size="13" font-weight="600">' + esc(node.label) + '</text>' +
      '<text x="14" y="41" fill="#90a4b7" font-size="11">' + esc(node.sub.slice(0, 32)) + '</text>' +
      '<text x="14" y="60" fill="' + stroke + '" font-size="11">' + esc(deltaText || node.state) + '</text>' +
      '</g>';
  }).join('');

  return '<div style="overflow:auto;border:1px solid var(--line);border-radius:8px;background:var(--bg)">' +
    '<svg width="' + width + '" height="' + height + '" style="display:block">' + edges + boxes + '</svg></div>' +
    '<p class="muted">' + campaigns.length + ' campaign(s). Each column is a generation: every candidate hangs off the variant it was proposed from. ' +
    'Green edges are acceptances — only those extend the chain; red nodes are dead ends that were measured and rejected.</p>';
}

/* ------------------------------------------------------------- campaign */
function viewCampaign() {
  const accepted = DATA.rounds.filter((r) => r.gate && r.gate.accepted).length;
  const sealed = DATA.sealed;

  const timeline = lineageGraph();

  const sealedTable = sealed.length
    ? '<table><tr><th>config</th><th>reward</th><th>anchor</th><th>generated</th><th>cost</th><th>$/solved</th></tr>' +
      sealed.map((run) => '<tr><td><span class="' + (run.isBaseline ? 'muted' : 'good') + '">' +
        esc(run.label) + '</span></td><td>' + n(run.meanReward) + '</td><td>' + n(run.anchorReward) +
        '</td><td>' + n(run.generatedReward) + '</td><td>' + usd(run.totalCostUsd) + '</td><td>' +
        usd(run.costPerSolved) + '</td></tr>').join('') + '</table>'
    : '<p class="muted">No sealed-split runs yet.</p>';

  return '<h2>Campaign</h2>' +
    cards([
      ['rounds', DATA.rounds.length],
      ['accepted', accepted, accepted ? 'good' : 'muted'],
      ['examples', DATA.exampleCount],
      ['total runs', DATA.runs.length],
      ['spend (all runs)', usd(DATA.totalCostUsd)],
    ]) +
    '<h3>Lineage — configs tried, and what was built on what</h3>' + timeline +
    '<h3>Sealed split</h3>' + sealedTable +
    '<h3>What each round proposed</h3>' +
    '<table><tr><th>campaign</th><th>round</th><th>files</th><th>Δ reward [CI]</th><th>$/solved</th><th>regressions</th><th>verdict</th><th>rationale</th></tr>' +
    DATA.rounds.map((round) => {
      const g = round.gate;
      return '<tr ' + goAttr({ tab: 'rounds', round: round.round }) + ' style="cursor:pointer">' +
        '<td class="muted">' + esc(String(round.campaignId).slice(4, 12)) + '</td>' +
        '<td>' + round.round + '</td><td>' + esc((round.slots || []).map(shortPath).join(', ')) + '</td>' +
        '<td class="' + cls(g ? g.meanDelta : 0) + '">' + (g ? sign(g.meanDelta) + ' [' + n(g.ciLow) + ', ' + n(g.ciHigh) + ']' : '—') + '</td>' +
        '<td>' + (g ? usd(g.incumbentCostPerSolved) + ' → ' + usd(g.candidateCostPerSolved) : '—') + '</td>' +
        '<td>' + (g ? (g.regressions || []).length : '—') + '</td>' +
        '<td>' + verdict(round) + '</td>' +
        '<td class="muted">' +
        esc(stripPaths((round.failures || [])[0] || round.rationale || '').slice(0, 140)) +
        '</td></tr>';
    }).join('') + '</table>';
}

/* --------------------------------------------------------------- rounds */
function viewRounds() {
  if (route.round === undefined) {
    return '<h2>Rounds</h2>' + DATA.rounds.map((round) =>
      '<p><a ' + goAttr({ tab: 'rounds', round: round.round }) + '>round ' +
      round.round + '</a> — ' + verdict(round) + ' ' + esc((round.slots || []).join(', ')) + '</p>').join('');
  }

  const round = DATA.rounds.find((r) => r.round === route.round);
  if (!round) return '<p>Round not found.</p>';
  const g = round.gate;

  const perSeed = (round.seedDeltas || []).slice().sort((a, b) => a.delta - b.delta);

  const attemptBlock = (title, attempts, colour) =>
    '<div><div class="muted">' + title + '</div>' +
    (attempts || []).map((attempt) =>
      '<pre class="' + colour + '">' + esc(attempt.query || '(no query)') + '</pre>' +
      '<div class="muted">reward ' + n(attempt.reward, 2) + ' · ' +
      (attempt.executes ? 'executes' : 'FAILS') + ' · rows ' + (attempt.rowCount ?? '—') +
      ' vs gold ' + (attempt.goldRowCount ?? '—') + ' · eq ' + n(attempt.resultEquivalence, 2) +
      ' · ' + (attempt.tries ?? '—') + ' tries · ' + usd(attempt.costUsd) + '</div>' +
      (attempt.error ? '<pre class="bad">' + esc(String(attempt.error).slice(0, 400)) + '</pre>' : '')
    ).join('') + '</div>';

  const seedRows = perSeed.map((seed) =>
    '<tr><td class="' + cls(seed.delta) + '">' + sign(seed.delta, 2) + '</td>' +
    '<td>' + n(seed.incumbent, 2) + ' → ' + n(seed.candidate, 2) + '</td>' +
    '<td class="muted">' + esc(seed.provenance) + '</td>' +
    '<td><details><summary>' + esc(seed.question.slice(0, 110)) + '</summary>' +
    '<div class="muted" style="margin-top:6px">gold</div><pre>' + esc(seed.goldQuery) + '</pre>' +
    '<div class="split">' +
    attemptBlock('incumbent produced', seed.incumbentAttempts, 'diff-del') +
    attemptBlock('candidate produced', seed.candidateAttempts, 'diff-add') +
    '</div>' +
    '<p><a ' + goAttr({ tab: 'examples', example: seed.exampleId }) +
    '>full history for this example →</a></p></details></td></tr>'
  ).join('');

  const reachedGate = Boolean(round.gate);
  const verification = round.verification
    ? '<table><tr><th>predicted</th><th>claimed</th><th>actually happened</th></tr>' +
      '<tr><td>fixes</td><td>' + (round.verification.predictedFixes || 0) + '</td><td class="' +
      cls(round.verification.fixesConfirmed) + '">' + round.verification.fixesConfirmed + ' confirmed</td></tr>' +
      '<tr><td>regressions</td><td>' + (round.verification.predictedRegressions || 0) + '</td><td>' +
      round.verification.regressionsConfirmed + ' confirmed, ' + round.verification.unpredictedRegressions +
      ' unpredicted</td></tr>' +
      (round.verification.unmatched
        ? '<tr><td class="warn">unmatched</td><td>' + round.verification.unmatched +
          '</td><td class="warn">named no example in the bundle — cannot be scored</td></tr>'
        : '') +
      '</table>' +
      '<table><tr><th>prediction</th><th>Δ</th><th>outcome</th></tr>' +
      (round.verification.details || []).map((detail) =>
        '<tr><td>' + esc(String(detail.question).slice(0, 90)) + '</td><td class="' +
        cls(detail.delta) + '">' + sign(detail.delta, 2) + '</td><td>' +
        (!detail.matched ? '<span class="warn">unmatched</span>'
          : detail.confirmed ? '<span class="good">confirmed</span>'
          : '<span class="muted">did not happen</span>') + '</td></tr>').join('') + '</table>'
    : '<p class="muted">No manifest to verify.</p>';

  const failureBlock = (round.failures || []).length
    ? '<h3>Why it never reached the gate</h3>' +
      (round.failures || [])
        .map((failure) => '<pre class="bad">' + esc(String(failure).slice(0, 4000)) + '</pre>')
        .join('')
    : '';

  return '<p class="back" ' + goAttr({ tab: 'campaign' }) + '>← campaign</p>' +
    '<h2>Round ' + round.round + ' ' + verdict(round) + '</h2>' +
    failureBlock +
    (g ? cards([
      ['Δ reward', sign(g.meanDelta), cls(g.meanDelta)],
      ['95% CI', '[' + n(g.ciLow) + ', ' + n(g.ciHigh) + ']'],
      ['$ / solved', usd(g.incumbentCostPerSolved) + ' → ' + usd(g.candidateCostPerSolved)],
      ['cost ratio', n(g.costRatio, 2) + '×', g.costRatio > 1.1 ? 'bad' : 'good'],
      ['model', esc(round.model || 'code default')],
      ['improved seeds', (g.improvements || []).length, 'good'],
      ['regressed seeds', (g.regressions || []).length, (g.regressions || []).length ? 'bad' : 'muted'],
    ]) : '') +
    (g && !g.accepted ? '<p class="bad">' + esc((g.reasons || []).join(' · ')) + '</p>' : '') +
    '<h3>What changed</h3>' + renderDiff(round.diff, round.filesChanged) +
    '<h3>Why (proposer rationale)</h3><pre>' + esc(round.rationale || '—') + '</pre>' +
    (reachedGate
      ? '<h3>Manifest verification <span class="muted">— checked on the search split the ' +
        'proposal read, not on the gate split</span></h3>' + verification +
        '<h3>Per-seed effect (' + perSeed.length +
        ' seeds, worst first) — expand a row to see both sides</h3>' +
        '<table><tr><th>Δ</th><th>reward</th><th>source</th><th>question</th></tr>' + seedRows +
        '</table>'
      : '<p class="muted">This round was stopped before measurement, so there are no per-seed ' +
        'results and nothing to verify the manifest against.</p>') +
    '<h3>Runs in this round</h3>' +
    (round.runs || []).map((runId) => '<p><a ' + goAttr({ tab: 'runs', run: runId }) + '>' + esc(runId) + '</a></p>').join('');
}

/* ----------------------------------------------------------------- runs */
function viewRuns() {
  if (route.run === undefined) {
    const rows = DATA.runs.map((run) =>
      '<tr><td><a ' + goAttr({ tab: 'runs', run: run.id }) + '>' + esc(run.label) + '</a></td>' +
      '<td class="muted">' + esc(run.group) + '</td><td>' + n(run.meanReward) + '</td>' +
      '<td>' + pct(run.meanExecutes) + '</td><td>' + n(run.meanResultEquivalence) + '</td>' +
      '<td>' + usd(run.totalCostUsd) + (run.costEstimated ? '<span class="muted"> est</span>' : '') +
      '</td><td>' + run.exampleCount + '</td>' +
      '<td class="muted">' + esc(run.models.join(', ')) + '</td></tr>').join('');
    return '<h2>Runs</h2><table><tr><th>run</th><th>group</th><th>reward</th><th>executes</th>' +
      '<th>result eq</th><th>cost</th><th>n</th><th>models</th></tr>' + rows + '</table>';
  }

  const run = DATA.runs.find((r) => r.id === route.run);
  if (!run) return '<p>Run not found.</p>';
  const q = (route.q || '').toLowerCase();
  const provenance = route.provenance || '';
  const rows = run.results
    .filter((r) => (!q || (r.question + ' ' + (r.generatedQuery || '')).toLowerCase().includes(q)) &&
                   (!provenance || r.provenance === provenance))
    .sort((a, b) => (a.score.reward ?? 0) - (b.score.reward ?? 0));

  const provenances = [...new Set(run.results.map((r) => r.provenance))];

  return '<p class="back" ' + goAttr({ tab: 'runs' }) + '>← runs</p>' +
    '<h2>' + esc(run.label) + ' <span class="muted">' + esc(run.group) + '</span></h2>' +
    cards([
      ['reward', n(run.meanReward)],
      ['executes', pct(run.meanExecutes)],
      ['result eq', n(run.meanResultEquivalence)],
      ['tries', n(run.meanTries, 2)],
      ['cost' + (run.costEstimated ? ' (est.)' : ''), usd(run.totalCostUsd)],
      ['tokens', run.totalInputTokens + ' / ' + run.totalOutputTokens],
    ]) +
    '<h3>By provenance</h3><table><tr><th>source</th><th>reward</th><th>runs</th></tr>' +
    Object.entries(run.rewardByProvenance || {}).map(([k, v]) =>
      '<tr><td>' + esc(k) + '</td><td>' + n(v.reward) + '</td><td>' + v.count + '</td></tr>').join('') + '</table>' +
    '<div class="toolbar"><input id="filter" type="search" placeholder="filter question or query" value="' +
    esc(route.q || '') + '" size="40">' +
    '<select id="provenance"><option value="">all sources</option>' +
    provenances.map((p) => '<option' + (p === provenance ? ' selected' : '') + '>' + esc(p) + '</option>').join('') +
    '</select><span class="muted">' + rows.length + ' shown</span></div>' +
    '<table><tr><th>reward</th><th>source</th><th>question</th><th>generated vs gold</th><th>tries</th><th>cost</th></tr>' +
    rows.map((r) =>
      '<tr><td class="' + (r.score.reward >= 0.95 ? 'good' : r.score.reward > 0.4 ? 'warn' : 'bad') + '">' +
      n(r.score.reward, 2) + '</td><td class="muted">' + esc(r.provenance) + '</td>' +
      '<td><a ' + goAttr({ tab: 'examples', example: r.exampleId }) + '>' +
      esc(r.question.slice(0, 120)) + '</a></td>' +
      '<td><details><summary>' + (r.score.executes ? 'executes' : 'fails') + ' · eq ' +
      n(r.score.resultEquivalence, 2) + '</summary><div class="split"><div><div class="muted">generated</div><pre>' +
      esc(r.generatedQuery || '(none)') + '</pre></div><div><div class="muted">gold</div><pre>' +
      esc(r.goldQuery) + '</pre></div></div>' +
      (r.score.error ? '<div class="muted">error</div><pre class="bad">' + esc(r.score.error.slice(0, 700)) + '</pre>' : '') +
      '</details></td><td>' + (r.tries ?? '—') + '</td><td>' + usd(r.costUsd) + '</td></tr>').join('') +
    '</table>';
}

/* ------------------------------------------------------------- examples */
function viewExamples() {
  if (route.example === undefined) {
    const q = (route.q || '').toLowerCase();
    const rows = DATA.examples
      .filter((e) => !q || e.question.toLowerCase().includes(q))
      .sort((a, b) => a.meanReward - b.meanReward)
      .map((e) =>
        '<tr><td class="' + (e.meanReward >= 0.95 ? 'good' : e.meanReward > 0.4 ? 'warn' : 'bad') + '">' +
        n(e.meanReward, 2) + '</td><td><div class="bar"><div style="width:' + Math.round(e.meanReward * 100) +
        '%"></div></div></td><td class="muted">' + esc(e.provenance) + '</td><td class="muted">' +
        esc(e.difficulty || '') + '</td><td>' + e.runs + '</td>' +
        '<td><a ' + goAttr({ tab: 'examples', example: e.exampleId }) + '>' +
        esc(e.question.slice(0, 130)) + '</a></td></tr>').join('');
    return '<h2>Examples</h2>' +
      '<div class="toolbar"><input id="filter" type="search" placeholder="filter questions" value="' +
      esc(route.q || '') + '" size="40"></div>' +
      '<table><tr><th>mean reward</th><th></th><th>source</th><th>difficulty</th><th>runs</th><th>question</th></tr>' +
      rows + '</table>';
  }

  const example = DATA.examples.find((e) => e.exampleId === route.example);
  if (!example) return '<p>Example not found.</p>';
  return '<p class="back" ' + goAttr({ tab: 'examples' }) + '>← examples</p>' +
    '<h2>' + esc(example.question) + '</h2>' +
    cards([
      ['mean reward', n(example.meanReward)],
      ['runs', example.runs],
      ['source', esc(example.provenance)],
      ['difficulty', esc(example.difficulty || '—')],
      ['target index', esc(example.index || '—')],
    ]) +
    '<h3>Gold</h3><pre>' + esc(example.goldQuery) + '</pre>' +
    '<h3>Every attempt, newest run last</h3>' +
    '<table><tr><th>run</th><th>reward</th><th>eq</th><th>tries</th><th>model</th><th>query</th></tr>' +
    example.history.map((h) =>
      '<tr><td><a ' + goAttr({ tab: 'runs', run: h.runId }) + '>' + esc(h.label) + '</a></td>' +
      '<td class="' + (h.reward >= 0.95 ? 'good' : h.reward > 0.4 ? 'warn' : 'bad') + '">' + n(h.reward, 2) + '</td>' +
      '<td>' + n(h.resultEquivalence, 2) + '</td><td>' + (h.tries ?? '—') + '</td>' +
      '<td class="muted">' + esc((h.connectorId || '').replace('harness-opt-', '')) + '</td>' +
      '<td><details><summary>' + (h.executes ? 'executes' : 'fails') + '</summary><pre>' +
      esc(h.generatedQuery || '(none)') + '</pre>' +
      (h.error ? '<pre class="bad">' + esc(h.error.slice(0, 500)) + '</pre>' : '') + '</details></td></tr>').join('') +
    '</table>';
}

/* -------------------------------------------------------------- dataset */
function viewDataset() {
  const byProvenance = {};
  DATA.examples.forEach((e) => {
    const key = e.provenance;
    byProvenance[key] = byProvenance[key] || { count: 0, reward: 0, splits: {} };
    byProvenance[key].count++;
    byProvenance[key].reward += e.meanReward;
    byProvenance[key].splits[e.split] = (byProvenance[key].splits[e.split] || 0) + 1;
  });

  const difficulty = {};
  DATA.examples.forEach((e) => { const k = e.difficulty || 'unlabelled';
    difficulty[k] = (difficulty[k] || 0) + 1; });

  return '<h2>Dataset</h2>' +
    '<table><tr><th>source</th><th>examples</th><th>mean reward</th><th>splits</th></tr>' +
    Object.entries(byProvenance).map(([k, v]) =>
      '<tr><td>' + esc(k) + '</td><td>' + v.count + '</td><td>' + n(v.reward / v.count) + '</td>' +
      '<td class="muted">' + esc(JSON.stringify(v.splits)) + '</td></tr>').join('') + '</table>' +
    '<h3>Difficulty labels (generated corpus)</h3>' +
    '<table><tr><th>label</th><th>count</th></tr>' + Object.entries(difficulty).map(([k, v]) =>
      '<tr><td>' + esc(k) + '</td><td>' + v + '</td></tr>').join('') + '</table>' +
    '<p class="muted">Saturation guard: a corpus where the incumbent scores ~1.0 everywhere cannot ' +
    'show an improvement. Flipping cases are kept in full, never-solved examples are capped, and ' +
    'trivial ones are admitted only as regression ballast.</p>';
}

go({ tab: 'campaign' });
</script>
</body>
</html>`;
