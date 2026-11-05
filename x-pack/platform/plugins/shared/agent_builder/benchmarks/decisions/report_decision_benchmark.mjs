/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Turns x-pack/platform/plugins/shared/agent_builder/benchmarks/decisions/results.json into Markdown tables and Mermaid charts.
// Usage: node x-pack/platform/plugins/shared/agent_builder/benchmarks/decisions/report_decision_benchmark.mjs > x-pack/platform/plugins/shared/agent_builder/benchmarks/decisions/report.md

import { readFileSync } from 'fs';

const load = (file) => JSON.parse(readFileSync(new URL(`./${file}`, import.meta.url), 'utf8'));
// Jev through EIS; the fast model from the latest run (calibrated prompt, bb0381f).
const results = [
  // Jev through EIS (.typesafe-jev-1.13_decision on QA); JEV_RESULTS=results.json for the OpenRouter run.
  ...load(process.env.JEV_RESULTS ?? 'results_jev_eis.json')
    .filter((r) => r.model === 'jev' || r.model === 'jev_eis')
    .map((r) => ({ ...r, model: 'jev' })),
  ...load(process.env.FAST_RESULTS ?? 'results_calibrated.json').filter(
    (r) => r.model === 'fast_model'
  ),
];

const MODELS = [
  ['jev', 'Jev 1.13'],
  ['fast_model', 'Gemini 3.5 Flash Lite'],
];
const TYPES = [
  ['predicate', 'yes/no'],
  ['choice', 'pick one'],
  ['score', 'score'],
];
// Each provider's timeout: decision models get timeoutMs (1s), the fast model fastModelTimeoutMs (2s).
const BUDGET_MS = { jev: 1000, fast_model: 2000 };

const pick = (filter) =>
  results.filter((r) => Object.entries(filter).every(([k, v]) => r[k] === v));
const percent = (part, total) => (total ? Math.round((part / total) * 100) : 0);
const quantile = (values, q) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
};
const median = (values) => quantile(values, 0.5);
const accuracy = (rows) => percent(rows.filter((r) => r.correct).length, rows.length);

/** A case is consistent when all its runs gave the same answer. */
const consistency = (rows) => {
  const byCase = Object.groupBy(rows, (r) => r.id);
  const groups = Object.values(byCase);
  return percent(
    groups.filter((runs) => new Set(runs.map((r) => String(r.answer))).size === 1).length,
    groups.length
  );
};

const yesNo = (value) => (value ? 'yes' : 'no');

const formatAnswer = (r) => {
  if (r.error) {
    return '⚠️ error';
  }
  const answer = r.type === 'predicate' ? yesNo(r.answer) : r.answer;
  return `${r.correct ? '✅' : '❌'} ${answer} ${r.value.toFixed(2)}`;
};

const formatExpected = (r) => (r.type === 'predicate' ? yesNo(r.expected) : r.expected);

const lines = [];
const out = (line = '') => lines.push(line);

// Summary
out('#### Summary');
out();
out(
  '| Model | Correct | yes/no | pick one | score | Consistent across runs | Median latency | p95 latency | Budget | Over budget |'
);
out('|---|---|---|---|---|---|---|---|---|---|');
for (const [model, name] of MODELS) {
  const rows = pick({ model });
  const latencies = rows.map((r) => r.latencyMs);
  out(
    `| ${name} | ${rows.filter((r) => r.correct).length}/${rows.length} (${accuracy(
      rows
    )}%) | ${TYPES.map(([type]) => `${accuracy(pick({ model, type }))}%`).join(
      ' | '
    )} | ${consistency(rows)}% | ${median(latencies)} ms | ${quantile(latencies, 0.95)} ms | ${
      BUDGET_MS[model] / 1000
    }s | ${rows.filter((r) => r.latencyMs > BUDGET_MS[model]).length}/${rows.length} |`
  );
}
out();

// Charts
const categories = MODELS.flatMap(([, name]) =>
  TYPES.map(([, label]) => `${name.split(' ')[0]} ${label}`)
);
const series = (fn) =>
  MODELS.flatMap(([model]) => TYPES.map(([type]) => fn(pick({ model, type }))));

out('```mermaid');
out('xychart-beta');
out('  title "Accuracy by question type (%)"');
out(`  x-axis [${categories.map((c) => `"${c}"`).join(', ')}]`);
out('  y-axis "Correct (%)" 0 --> 100');
out(`  bar [${series(accuracy).join(', ')}]`);
out('```');
out();
out('```mermaid');
out('xychart-beta');
out('  title "Median latency by question type (ms)"');
out(`  x-axis [${categories.map((c) => `"${c}"`).join(', ')}]`);
const latencySeries = series((rows) => median(rows.map((r) => r.latencyMs)));
const budgets = MODELS.flatMap(([model]) => TYPES.map(() => BUDGET_MS[model]));
out(
  `  y-axis "Median latency (ms)" 0 --> ${
    Math.ceil(Math.max(...latencySeries, ...budgets) / 250) * 250
  }`
);
out(`  bar [${latencySeries.join(', ')}]`);
out(`  line [${budgets.join(', ')}]`);
out('```');
out();
out("The line is each provider's budget: 1s for Jev, 2s for the fast model.");
out();

const caseIds = [...new Set(results.map((r) => r.id))];
out('```mermaid');
out('xychart-beta');
out('  title "Median latency per case (ms): Jev bars, Gemini line"');
out(`  x-axis [${caseIds.map((id) => `"${id}"`).join(', ')}]`);
const caseLatency = (model) =>
  caseIds.map((id) => median(pick({ model, id }).map((r) => r.latencyMs)));
const maxCase = Math.max(...caseLatency('jev'), ...caseLatency('fast_model'));
out(`  y-axis "Median latency (ms)" 0 --> ${Math.ceil(maxCase / 250) * 250}`);
out(`  bar [${caseLatency('jev').join(', ')}]`);
out(`  line [${caseLatency('fast_model').join(', ')}]`);
out('```');
out();

// Calibration: how confident each model said it was, on choice and score questions.
out('#### Confidence when right vs wrong (pick one and score)');
out();
out('| Model | Mean confidence when right | Mean confidence when wrong | Wrong calls |');
out('|---|---|---|---|');
for (const [model, name] of MODELS) {
  const rows = pick({ model }).filter((r) => r.type !== 'predicate' && !r.error);
  const mean = (subset) =>
    subset.length ? (subset.reduce((sum, r) => sum + r.value, 0) / subset.length).toFixed(2) : '–';
  const wrong = rows.filter((r) => !r.correct);
  out(`| ${name} | ${mean(rows.filter((r) => r.correct))} | ${mean(wrong)} | ${wrong.length} |`);
}
out();

// Per-case tables
for (const [type, label] of TYPES) {
  out(`#### ${label}`);
  out();
  out('| Case | Expected | Jev runs | Jev median | Gemini runs | Gemini median |');
  out('|---|---|---|---|---|---|');
  for (const id of caseIds) {
    const jev = pick({ id, type, model: 'jev' });
    const fast = pick({ id, type, model: 'fast_model' });
    if (!jev.length) {
      continue;
    }
    out(
      `| **${id}** ${jev[0].label} | ${formatExpected(jev[0])} | ${jev
        .map(formatAnswer)
        .join('<br>')} | ${median(jev.map((r) => r.latencyMs))} ms | ${fast
        .map(formatAnswer)
        .join('<br>')} | ${median(fast.map((r) => r.latencyMs))} ms |`
    );
  }
  out();
}

process.stdout.write(lines.join('\n'));
