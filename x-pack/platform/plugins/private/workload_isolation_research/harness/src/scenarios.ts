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
  /** Labelled stress points from the prod baseline (TM-blocked p99 23s, max 116s). Not part of every sweep. */
  'tier-a-stress': {
    name: 'tier-a-stress',
    description: 'cpu_spin 30s and 120s via route and TM task (prod tail calibration).',
    probe: { ...probe, timeoutMs: 300000 },
    laptopProbe,
    ticks,
    phases: [
      { name: 'warmup', durationS: 10 },
      { name: 'baseline', durationS: 40 },
      {
        name: 'stress-cpu_spin-task-30000ms',
        durationS: 20,
        offender: { kind: 'cpu_spin', mode: 'task', doseMs: 30000 },
      },
      {
        name: 'stress-cpu_spin-route-30000ms',
        durationS: 20,
        offender: { kind: 'cpu_spin', mode: 'route', doseMs: 30000 },
      },
      {
        name: 'stress-cpu_spin-task-120000ms',
        durationS: 30,
        offender: { kind: 'cpu_spin', mode: 'task', doseMs: 120000 },
      },
      {
        name: 'stress-cpu_spin-route-120000ms',
        durationS: 30,
        offender: { kind: 'cpu_spin', mode: 'route', doseMs: 120000 },
      },
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
  /** Tier B: Agent Builder multi-tool run with mocked LLM (prod worst tail: p99 110s). */
  'tier-b-agent-builder': {
    name: 'tier-b-agent-builder',
    description:
      '5 parallel execute_esql calls x 1000 wide rows, then answer; HTTP (local) and TM execution.',
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
        name: 'ab-local-5x1000',
        durationS: 10,
        action: 'agent-builder',
        actionParams: { calls: 5, limit: 1000, mode: 'local' },
      },
      {
        name: 'ab-task-5x1000',
        durationS: 10,
        action: 'agent-builder',
        actionParams: { calls: 5, limit: 1000, mode: 'task_manager' },
      },
    ],
  },
  /** Agent Builder at a larger dose (prod tail p99 110s): 10 parallel calls x 5000 wide rows. */
  'tier-b-agent-builder-stress': {
    name: 'tier-b-agent-builder-stress',
    description:
      '10 parallel execute_esql calls x 5000 rows x 100 fields; HTTP (local) and TM execution.',
    probe,
    laptopProbe,
    ticks,
    phases: [
      {
        name: 'seed',
        durationS: 5,
        action: 'seed',
        actionParams: { kind: 'alerting_wide', rows: 5000, fields: 100 },
      },
      { name: 'warmup', durationS: 10 },
      { name: 'baseline', durationS: 40 },
      {
        name: 'ab-local-10x5000',
        durationS: 10,
        action: 'agent-builder',
        actionParams: { calls: 10, limit: 5000, mode: 'local' },
      },
      {
        name: 'ab-task-10x5000',
        durationS: 10,
        action: 'agent-builder',
        actionParams: { calls: 10, limit: 5000, mode: 'task_manager' },
      },
    ],
  },
  /** Tier B: workflow data.map over 10k rows (runs as a TM task). */
  'tier-b-workflow': {
    name: 'tier-b-workflow',
    description: 'elasticsearch.search size 10000 then data.map with 12 templated fields per row.',
    probe,
    laptopProbe,
    ticks,
    phases: [
      {
        name: 'seed',
        durationS: 5,
        action: 'seed',
        actionParams: { kind: 'alerting_wide', rows: 10000, fields: 20 },
      },
      { name: 'warmup', durationS: 10 },
      { name: 'baseline', durationS: 40 },
      {
        name: 'workflow-map-10000',
        durationS: 15,
        action: 'workflow-map',
        actionParams: { size: 10000, fields: 10 },
      },
    ],
  },
  /** Tracer validation (never a perf run): every Tier B replay once, tracer on. */
  'tier-b-tracer-suite': {
    name: 'tier-b-tracer-suite',
    description: 'All Tier B replays at modest doses with KBN_RESEARCH_CONTRACT_TRACER=true.',
    probe,
    laptopProbe,
    ticks,
    phases: [
      {
        name: 'seed-rows',
        durationS: 2,
        action: 'seed',
        actionParams: { kind: 'alerting_wide', rows: 1000, fields: 100 },
      },
      { name: 'baseline', durationS: 20 },
      {
        name: 'alerting-esql-1000x2',
        durationS: 5,
        action: 'alerting-esql',
        actionParams: { rows: 1000, actionsPerAlert: 2, drainS: 30 },
      },
      {
        name: 'workflow-map-1000',
        durationS: 5,
        action: 'workflow-map',
        actionParams: { size: 1000, fields: 10 },
      },
      {
        name: 'ab-local-5x1000',
        durationS: 5,
        action: 'agent-builder',
        actionParams: { calls: 5, limit: 1000, mode: 'local' },
      },
      {
        name: 'ab-task-5x1000',
        durationS: 5,
        action: 'agent-builder',
        actionParams: { calls: 5, limit: 1000, mode: 'task_manager' },
      },
      {
        name: 'fc-m-seed',
        durationS: 2,
        action: 'seed',
        actionParams: {
          kind: 'field_caps',
          indices: 100,
          fieldsPerIndex: 2000,
          uniqueRatio: 0.5,
          conflictRatio: 0.2,
        },
      },
      {
        name: 'fc-m-route-e2e',
        durationS: 5,
        action: 'field-caps',
        actionParams: { repeat: 2, decompose: false, mode: 'route' },
      },
      {
        name: 'fc-m-task',
        durationS: 5,
        action: 'field-caps',
        actionParams: { repeat: 2, decompose: true, mode: 'task', waitS: 20 },
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
        // doseMs is only the safety cap (driver waits cap + 5s); the supervisor kills at 30s.
        offender: { kind: 'infinite_loop', mode: 'task', doseMs: 60000 },
      },
    ],
  },
};
