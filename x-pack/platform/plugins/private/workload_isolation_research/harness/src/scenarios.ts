/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OffenderSpec, Phase, Scenario } from './types';

const probe = { rps: 10, path: '/api/spaces/space' };
const laptopProbe = { rps: 2, path: '/api/spaces/space' };
const ticks = { intervalMs: 1000 };

const sweep = (
  kind: OffenderSpec['kind'],
  mode: OffenderSpec['mode'],
  doses: number[],
  recoveryS: number
): Phase[] =>
  doses.map((doseMs) => ({
    name: `${kind}-${mode}-${doseMs}ms`,
    durationS: recoveryS,
    offender: { kind, mode, doseMs },
  }));
<<<<<<< HEAD
=======

const fieldCapsDose = (label: string, seed: Record<string, number>): Phase[] => [
  {
    name: `fc-${label}-seed`,
    durationS: 5,
    action: 'seed',
    actionParams: { kind: 'field_caps', conflictRatio: 0.2, ...seed },
  },
  {
    name: `fc-${label}-route-decomposed`,
    durationS: 10,
    action: 'field-caps',
    actionParams: { repeat: 3, decompose: true, mode: 'route' },
  },
  {
    name: `fc-${label}-task-decomposed`,
    durationS: 10,
    action: 'field-caps',
    actionParams: { repeat: 3, decompose: true, mode: 'task', waitS: 20 },
  },
  {
    name: `fc-${label}-route-e2e`,
    durationS: 10,
    action: 'field-caps',
    actionParams: { repeat: 3, decompose: false, mode: 'route' },
  },
];
>>>>>>> 516f0dd2e43f ([Research] harness: Tier B field caps + alerting replays, QA overview export, CI hygiene (moon, codeowners, plugin list, lint))

export const SCENARIOS: Record<string, Scenario> = {
  /** Harness self-check: one 10s CPU block from a route and from a task. */
  'red-demo': {
    name: 'red-demo',
    description: 'Baseline then a 10s cpu_spin via route and via TM task.',
    probe,
    laptopProbe,
    ticks,
    phases: [
      { name: 'warmup', durationS: 15 },
      { name: 'baseline', durationS: 40 },
      {
        name: 'cpu_spin-route-10000ms',
        durationS: 15,
        offender: { kind: 'cpu_spin', mode: 'route', doseMs: 10000 },
      },
      {
        name: 'cpu_spin-task-10000ms',
        durationS: 15,
        offender: { kind: 'cpu_spin', mode: 'task', doseMs: 10000 },
      },
    ],
  },
  /** Tier A dose-response for every offender kind (route mode) plus cpu_spin as a task. */
  'tier-a-sweep': {
    name: 'tier-a-sweep',
    description: 'Dose sweep 10ms..10s for all Tier A kinds.',
    probe,
    laptopProbe,
    ticks,
    phases: [
      { name: 'warmup', durationS: 15 },
      { name: 'baseline', durationS: 40 },
      ...sweep('cpu_spin', 'route', [10, 100, 1000, 10000], 8),
      ...sweep('cpu_spin', 'task', [10, 100, 1000, 10000], 8),
      ...sweep('json_stringify', 'route', [10, 100, 1000, 10000], 8),
      ...sweep('regex_backtrack', 'route', [10, 100, 1000, 10000], 8),
      ...sweep('microtask_chain', 'route', [10, 100, 1000, 10000], 8),
    ],
  },
  /** Variance probe: baseline only, used for paired-vs-shared baseline decision. */
  'baseline-only': {
    name: 'baseline-only',
    description: 'Neighbour load only, 60s.',
    probe,
    laptopProbe,
    ticks,
    phases: [
      { name: 'warmup', durationS: 10 },
      { name: 'baseline', durationS: 60 },
    ],
  },
  /** Tier B #5: repeated large field_caps (SDH top family), route + task origin, decomposed timings. */
  'tier-b-field-caps': {
    name: 'tier-b-field-caps',
    description:
      'Dose sweep s/m/l of wide/conflicting/unique mappings; 3x field_caps via data views fetcher per phase.',
    probe,
    laptopProbe,
    ticks,
    phases: [
      { name: 'warmup', durationS: 10 },
      { name: 'baseline', durationS: 40 },
      ...fieldCapsDose('s', { indices: 50, fieldsPerIndex: 2000, uniqueRatio: 0 }),
      ...fieldCapsDose('m', { indices: 100, fieldsPerIndex: 2000, uniqueRatio: 0.5 }),
      ...fieldCapsDose('l', { indices: 200, fieldsPerIndex: 3000, uniqueRatio: 0.8 }),
    ],
  },
  /** Tier B #1: ES|QL rule over wide rows, one alert per row, mustache-heavy actions. */
  'tier-b-alerting': {
    name: 'tier-b-alerting',
    description: '1000 rows x 100 fields ES|QL rule (groupBy row) with 2 .index actions per alert.',
    probe,
    laptopProbe,
    ticks,
    phases: [
      {
        name: 'seed',
        durationS: 5,
        action: 'seed',
        actionParams: { kind: 'alerting_wide', rows: 1000, fields: 100 },
      },
      { name: 'warmup', durationS: 10 },
      { name: 'baseline', durationS: 40 },
      {
        name: 'alerting-esql-1000x2',
        durationS: 15,
        action: 'alerting-esql',
        actionParams: { rows: 1000, actionsPerAlert: 2, drainS: 30 },
      },
    ],
  },
  /** Non-terminating offender with emulated external supervision (SIGKILL after 30s stall). */
  'infinite-loop-supervised': {
    name: 'infinite-loop-supervised',
    description: 'infinite_loop via TM task; research worker kills the process after a 30s stall.',
    probe,
    laptopProbe,
    ticks,
    superviseKillAfterMs: 30000,
    phases: [
      { name: 'warmup', durationS: 10 },
      { name: 'baseline', durationS: 30 },
      {
        name: 'infinite_loop-task',
        durationS: 60,
        offender: { kind: 'infinite_loop', mode: 'task', doseMs: 600000 },
      },
    ],
  },
};
