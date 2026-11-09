/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { harnessPaths } from './workspace';

interface StoredRun {
  summary: Record<string, unknown>;
  config: Record<string, unknown>;
  runs: Array<Record<string, unknown>>;
}

interface ReportPayload {
  generatedAt: string;
  ledger: unknown[];
  runs: Array<{ id: string; file: string; summary: Record<string, unknown>; runs: unknown[] }>;
}

const collectRuns = (runsDir: string): ReportPayload['runs'] => {
  if (!Fs.existsSync(runsDir)) return [];
  const collected: ReportPayload['runs'] = [];

  for (const directory of Fs.readdirSync(runsDir).sort()) {
    const absolute = Path.join(runsDir, directory);
    if (!Fs.statSync(absolute).isDirectory()) continue;
    for (const file of Fs.readdirSync(absolute)) {
      if (!file.endsWith('.json')) continue;
      try {
        const stored = JSON.parse(Fs.readFileSync(Path.join(absolute, file), 'utf8')) as StoredRun;
        collected.push({
          id: `${directory}/${file.replace('.json', '')}`,
          file: Path.join(absolute, file),
          summary: { ...stored.summary, config: stored.config },
          // Only the fields the UI shows, so the report stays small enough to open.
          runs: stored.runs.map((run) => ({
            exampleId: run.exampleId,
            provenance: run.provenance,
            question: run.question,
            goldQuery: run.goldQuery,
            generatedQuery: run.generatedQuery,
            score: run.score,
            tries: run.tries,
            inputTokens: run.inputTokens,
            outputTokens: run.outputTokens,
            latencyMs: run.latencyMs,
          })),
        });
      } catch (e) {
        // a half-written run directory should not break the report
      }
    }
  }

  return collected;
};

const TEMPLATE = (payload: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>ES|QL harness optimization — rounds</title>
<style>
  :root { color-scheme: dark; --bg:#0d1117; --panel:#161b22; --line:#30363d; --fg:#e6edf3;
          --muted:#8b949e; --good:#3fb950; --bad:#f85149; --accent:#58a6ff; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; }
  header { padding:16px 24px; border-bottom:1px solid var(--line); display:flex; gap:24px; align-items:baseline; }
  h1 { font-size:16px; margin:0; font-weight:600; }
  .muted { color:var(--muted); }
  main { display:grid; grid-template-columns:320px 1fr; height:calc(100vh - 57px); }
  nav { border-right:1px solid var(--line); overflow:auto; }
  nav button { display:block; width:100%; text-align:left; background:none; border:none; color:var(--fg);
               padding:10px 16px; cursor:pointer; border-bottom:1px solid var(--line); font:inherit; }
  nav button:hover, nav button.active { background:var(--panel); }
  nav .tag { font-size:11px; padding:1px 6px; border-radius:10px; border:1px solid var(--line); }
  section { overflow:auto; padding:20px 24px; }
  table { border-collapse:collapse; width:100%; margin:12px 0 24px; }
  th, td { text-align:left; padding:6px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { color:var(--muted); font-weight:500; }
  pre { background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:10px;
        white-space:pre-wrap; overflow-x:auto; margin:6px 0; }
  .ok { color:var(--good); } .no { color:var(--bad); } .accent { color:var(--accent); }
  .pill { display:inline-block; padding:1px 8px; border-radius:10px; font-size:12px; border:1px solid var(--line); }
  details summary { cursor:pointer; padding:4px 0; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin-bottom:16px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:10px 12px; }
  .card .k { color:var(--muted); font-size:12px; } .card .v { font-size:18px; }
</style>
</head>
<body>
<header>
  <h1>ES|QL harness optimization</h1>
  <span class="muted" id="generated"></span>
</header>
<main>
  <nav id="nav"></nav>
  <section id="detail"></section>
</main>
<script id="payload" type="application/json">${payload}</script>
<script>
const data = JSON.parse(document.getElementById('payload').textContent);
document.getElementById('generated').textContent =
  data.ledger.length + ' rounds · ' + data.runs.length + ' runs · generated ' + data.generatedAt;

const n = (value, digits = 3) => (typeof value === 'number' ? value.toFixed(digits) : '—');
const esc = (value) => String(value ?? '').replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

const views = [
  ...data.ledger.map((entry, index) => ({ kind: 'round', index, entry })),
  ...data.runs.map((run, index) => ({ kind: 'run', index, run })),
];

const nav = document.getElementById('nav');
views.forEach((view, i) => {
  const button = document.createElement('button');
  if (view.kind === 'round') {
    const gate = view.entry.gate;
    const verdict = view.entry.rejected ? view.entry.rejected : gate ? (gate.accepted ? 'accepted' : 'rejected') : '—';
    const colour = gate && gate.accepted ? 'ok' : 'no';
    button.innerHTML = '<b>round ' + view.entry.round + '</b> <span class="tag ' + colour + '">' + verdict +
      '</span><br><span class="muted">' + esc((view.entry.manifest?.slots ?? []).join(', ') || 'no manifest') + '</span>';
  } else {
    button.innerHTML = '<b>' + esc(view.run.id.split('/')[1]) + '</b><br><span class="muted">reward ' +
      n(view.run.summary.meanReward) + ' · ' + esc(view.run.id.split('/')[0]) + '</span>';
  }
  button.onclick = () => select(i);
  nav.appendChild(button);
});

const configDiff = (config) => Object.entries(config ?? {})
  .map(([slot, value]) => '<tr><td>' + esc(slot) + '</td><td><pre>' + esc(JSON.stringify(value, null, 1)) + '</pre></td></tr>')
  .join('');

const renderRound = ({ entry }) => {
  const gate = entry.gate;
  const cards = gate ? [
    ['Δ reward', n(gate.meanDelta)],
    ['95% CI', '[' + n(gate.ciLow) + ', ' + n(gate.ciHigh) + ']'],
    ['tokens / solved', n(gate.incumbentCostPerSolved, 0) + ' → ' + n(gate.candidateCostPerSolved, 0)],
    ['regressions', (gate.regressions ?? []).length],
    ['improvements', (gate.improvements ?? []).length],
    ['cost ratio', n(gate.costRatio, 2) + '×'],
  ] : [];

  return '<h2>Round ' + entry.round + ' — ' +
    (entry.rejected ? '<span class="no">' + esc(entry.rejected) + '</span>'
      : gate?.accepted ? '<span class="ok">accepted via ' + esc(gate.acceptedVia) + '</span>'
      : '<span class="no">rejected</span>') + '</h2>' +
    '<div class="grid">' + cards.map(([k, v]) => '<div class="card"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>').join('') + '</div>' +
    (gate && !gate.accepted ? '<p class="muted">' + esc((gate.reasons ?? []).join(' · ')) + '</p>' : '') +
    (entry.manifest ? '<h3>Proposal manifest</h3><p><span class="pill">' + esc((entry.manifest.slots ?? []).join(', ')) + '</span></p>' +
      '<pre>' + esc(entry.manifest.rationale ?? '') + '</pre>' +
      '<details><summary>predicted fixes / regressions</summary><pre>' +
      esc(JSON.stringify({ fixes: entry.manifest.predictedFixes, regressions: entry.manifest.predictedRegressions }, null, 1)) +
      '</pre></details>' : '') +
    '<h3>Rewards</h3><table><tr><th>search (incumbent)</th><th>gate (incumbent)</th><th>gate (candidate)</th></tr>' +
    '<tr><td>' + n(entry.searchReward) + '</td><td>' + n(entry.incumbentGateReward) + '</td><td>' + n(entry.candidateGateReward) + '</td></tr></table>' +
    (entry.config ? '<h3>Candidate config</h3><table>' + configDiff(entry.config) + '</table>' : '');
};

const renderRun = ({ run }) => {
  const summary = run.summary;
  const byProvenance = Object.entries(summary.rewardByProvenance ?? {})
    .map(([key, value]) => '<tr><td>' + esc(key) + '</td><td>' + n(value.reward) + '</td><td>' + value.count + '</td></tr>').join('');

  const rows = [...run.runs]
    .sort((a, b) => (a.score?.reward ?? 0) - (b.score?.reward ?? 0))
    .map((item) => '<tr><td>' + (item.score?.reward >= 0.95 ? '<span class="ok">' : '<span class="no">') + n(item.score?.reward, 2) + '</span></td>' +
      '<td>' + esc(item.provenance) + '</td>' +
      '<td>' + esc(item.question).slice(0, 160) + '</td>' +
      '<td><details><summary>' + (item.score?.executes ? 'executes' : '<span class="no">fails</span>') +
      ' · eq ' + n(item.score?.resultEquivalence, 2) + '</summary>' +
      '<pre>' + esc(item.generatedQuery ?? '(no query)') + '</pre>' +
      '<div class="muted">gold</div><pre>' + esc(item.goldQuery) + '</pre>' +
      (item.score?.error ? '<div class="muted">error</div><pre>' + esc(item.score.error).slice(0, 800) + '</pre>' : '') +
      '</details></td>' +
      '<td>' + (item.tries ?? '—') + '</td><td>' + ((item.inputTokens ?? 0) + (item.outputTokens ?? 0)) + '</td></tr>').join('');

  return '<h2>' + esc(run.id) + '</h2>' +
    '<div class="grid">' +
    [['reward', n(summary.meanReward)], ['executes', n(summary.meanExecutes, 2)], ['result eq', n(summary.meanResultEquivalence)],
     ['tries', n(summary.meanTries, 2)], ['tokens', (summary.totalInputTokens ?? 0) + (summary.totalOutputTokens ?? 0)],
     ['config', esc(summary.configHash ?? '')]]
      .map(([k, v]) => '<div class="card"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>').join('') + '</div>' +
    (byProvenance ? '<h3>By provenance</h3><table><tr><th>source</th><th>reward</th><th>runs</th></tr>' + byProvenance + '</table>' : '') +
    '<h3>Examples (worst first)</h3><table><tr><th>reward</th><th>source</th><th>question</th><th>result</th><th>tries</th><th>tokens</th></tr>' + rows + '</table>';
};

function select(index) {
  [...nav.children].forEach((child, i) => child.classList.toggle('active', i === index));
  const view = views[index];
  document.getElementById('detail').innerHTML = view.kind === 'round' ? renderRound(view) : renderRun(view);
}
select(0);
</script>
</body>
</html>`;

/**
 * Write a single self-contained HTML file for browsing rounds and runs.
 *
 * Deliberately dependency-free and offline: the point is that anyone can open the artifact of a
 * campaign and audit what each round proposed, what it was measured at, and why it was accepted
 * or rejected — without the repo, a server, or the runner's state.
 */
export const writeReport = (): string => {
  const { runsDir, lineageDir, root } = harnessPaths();
  const ledgerPath = Path.join(lineageDir, 'ledger.json');
  const payload: ReportPayload = {
    generatedAt: new Date().toISOString(),
    ledger: Fs.existsSync(ledgerPath)
      ? (JSON.parse(Fs.readFileSync(ledgerPath, 'utf8')) as unknown[])
      : [],
    runs: collectRuns(runsDir),
  };

  const outputPath = Path.join(root, 'report.html');
  Fs.writeFileSync(outputPath, TEMPLATE(JSON.stringify(payload).replace(/</g, '\\u003c')));
  return outputPath;
};
