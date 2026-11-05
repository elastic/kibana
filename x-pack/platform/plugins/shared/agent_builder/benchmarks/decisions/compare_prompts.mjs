/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Compares the fast model's current prompt (results.json) with the calibrated one (results_calibrated.json).
import { readFileSync } from 'fs';

const load = (file) => JSON.parse(readFileSync(new URL(`./${file}`, import.meta.url), 'utf8'));
const runs = {
  'Jev 1.13': load('results.json').filter((r) => r.model === 'jev'),
  'Gemini, current prompt': load('results.json').filter((r) => r.model === 'fast_model'),
  'Gemini, calibrated prompt': load('results_calibrated.json'),
};

const pct = (rows, fn) => Math.round((rows.filter(fn).length / rows.length) * 100);
const mean = (rows) =>
  rows.length ? (rows.reduce((s, r) => s + r.value, 0) / rows.length).toFixed(2) : '–';
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const consistent = (rows) => {
  const groups = Object.values(Object.groupBy(rows, (r) => r.id));
  return Math.round(
    (groups.filter((g) => new Set(g.map((r) => String(r.answer))).size === 1).length /
      groups.length) *
      100
  );
};
// For yes/no, how far the probability sits from certainty: 0 means always 0.00 or 1.00.
const spread = (rows) => {
  const p = rows.filter((r) => r.type === 'predicate').map((r) => Math.min(r.value, 1 - r.value));
  return (p.reduce((s, v) => s + v, 0) / p.length).toFixed(2);
};

console.log(
  '| Run | Correct | yes/no | pick one | score | Consistent | Confidence right | Confidence wrong | Distinct confidence values | yes/no distance from 0/1 | Median latency | Over 1s |'
);
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [name, rows] of Object.entries(runs)) {
  const options = rows.filter((r) => r.type !== 'predicate');
  console.log(
    `| ${name} | ${rows.filter((r) => r.correct).length}/${rows.length} | ${[
      'predicate',
      'choice',
      'score',
    ]
      .map(
        (t) =>
          `${pct(
            rows.filter((r) => r.type === t),
            (r) => r.correct
          )}%`
      )
      .join(' | ')} | ${consistent(rows)}% | ${mean(options.filter((r) => r.correct))} | ${mean(
      options.filter((r) => !r.correct)
    )} | ${new Set(options.map((r) => r.value.toFixed(2))).size} | ${spread(rows)} | ${median(
      rows.map((r) => r.latencyMs)
    )} ms | ${rows.filter((r) => r.latencyMs > 1000).length}/${rows.length} |`
  );
}

console.log('\nPer case, calibrated Gemini (top probability per run):');
const calibrated = runs['Gemini, calibrated prompt'];
for (const id of [...new Set(calibrated.map((r) => r.id))]) {
  const rows = calibrated.filter((r) => r.id === id);
  console.log(
    `${id} expected ${rows[0].expected}: ${rows
      .map((r) => `${r.correct ? 'ok' : 'WRONG'} ${String(r.answer)} ${r.value.toFixed(2)}`)
      .join(' | ')}`
  );
}
