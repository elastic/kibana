/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Compares the should_respond instruction variants on the yes/no (P) and description (D) cases.
// Usage: node x-pack/platform/plugins/shared/agent_builder/benchmarks/decisions/compare_should_respond.mjs

import { readFileSync } from 'fs';

const load = (file) => JSON.parse(readFileSync(new URL(`./${file}`, import.meta.url), 'utf8'));
const asEis = (rows) => rows.map((r) => ({ ...r, model: r.model === 'jev' ? 'jev_eis' : r.model }));

// The original wording: P cases from the main runs, D cases from their own run.
const original = [
  ...load('results_scope_current.json'),
  ...asEis([...load('results_jev_eis.json'), ...load('results_calibrated.json')]).filter((r) =>
    r.id.startsWith('P')
  ),
];

const VARIANTS = [
  ['Original', original],
  ['+ description', load('results_scope_scoped.json')],
  ['+ @mention always replies', load('results_scope_mention.json')],
  ['+ unless told not to (adopted)', load('results_scope_mention_unless.json')],
];
const MODELS = [
  ['jev_eis', 'Jev (EIS)'],
  ['fast_model', 'Gemini'],
];
const IDS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6'];

const pick = (rows, model, id) =>
  rows.filter((r) => r.model === model && (id === undefined || r.id === id));
const margin = (rows) =>
  (rows.reduce((sum, r) => sum + Math.abs(r.value - 0.5), 0) / rows.length).toFixed(2);

console.log('| Instructions | Model | Correct | Consistent | Mean distance from 0.5 |');
console.log('|---|---|---|---|---|');
for (const [name, rows] of VARIANTS) {
  for (const [model, label] of MODELS) {
    const subset = pick(rows, model);
    const groups = Object.values(Object.groupBy(subset, (r) => r.id));
    const consistent = groups.filter((g) => new Set(g.map((r) => String(r.answer))).size === 1);
    console.log(
      `| ${name} | ${label} | ${subset.filter((r) => r.correct).length}/${subset.length} | ${
        consistent.length
      }/${groups.length} | ${margin(subset)} |`
    );
  }
}

for (const [model, label] of MODELS) {
  console.log(`\n${label}: probability per run (❌ = wrong)\n`);
  console.log(`| Case | Expected | ${VARIANTS.map(([name]) => name).join(' | ')} |`);
  console.log(`|---|---|${VARIANTS.map(() => '---').join('|')}|`);
  for (const id of IDS) {
    const expected = pick(VARIANTS[3][1], model, id)[0].expected ? 'yes' : 'no';
    const cells = VARIANTS.map(([, rows]) =>
      pick(rows, model, id)
        .map((r) => `${r.correct ? '' : '❌'}${r.value.toFixed(2)}`)
        .join(' ')
    );
    console.log(`| ${id} | ${expected} | ${cells.join(' | ')} |`);
  }
}
