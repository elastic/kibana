/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OffenderSpec, Scenario } from './types';

/** Identical task dose windows; main omits the new field for compatibility with the released control. */
export const isolatedTaskCurve = (execution: 'main' | 'thread'): Scenario => ({
  name: `t1-task-curve-${execution}`,
  description:
    'Task-only Tier A 10/100/1000/10000ms; measured work plus matched 20s recovery tails.',
  probe: { rps: 10, path: '/api/spaces/space' },
  laptopProbe: { rps: 2, path: '/api/spaces/space' },
  ticks: { intervalMs: 1000 },
  phases: [
    { name: 'warmup', durationS: 15 },
    { name: 'baseline', durationS: 40 },
    ...(['cpu_spin', 'json_stringify', 'regex_backtrack', 'microtask_chain'] as const).flatMap(
      (kind) =>
        [10, 100, 1000, 10000].map((doseMs) => ({
          name: `${kind}-task-${doseMs}ms`,
          durationS: 20,
          offender: {
            kind,
            mode: 'task',
            doseMs,
            ...(execution === 'thread' ? { execution, killAfterMs: 120000 } : {}),
          } satisfies OffenderSpec,
        }))
    ),
  ],
});

export const ISOLATED_SCENARIOS: Record<string, Scenario> = {
  't1-capacity-starvation': {
    name: 't1-capacity-starvation',
    description:
      'Negative control ONLY with local TM capacity5: five finite normal-cost tasks retain admission while two workers execute.',
    probe: { rps: 10, path: '/api/spaces/space' },
    laptopProbe: { rps: 2, path: '/api/spaces/space' },
    ticks: { intervalMs: 1000 },
    phases: [
      { name: 'warmup', durationS: 15 },
      { name: 'baseline', durationS: 40 },
      { name: 'five-admitted-two-worker-slots', durationS: 20, action: 'isolated-capacity' },
    ],
  },
  't1-task-curve-main': isolatedTaskCurve('main'),
  't1-task-curve-thread': isolatedTaskCurve('thread'),
  't1-worker-supervised': {
    name: 't1-worker-supervised',
    description:
      'True infinite worker, 10s independently supervised kill; explicit failed TM outcome then recovery.',
    probe: { rps: 10, path: '/api/spaces/space' },
    laptopProbe: { rps: 2, path: '/api/spaces/space' },
    ticks: { intervalMs: 1000 },
    phases: [
      { name: 'warmup', durationS: 15 },
      { name: 'baseline', durationS: 40 },
      {
        name: 'infinite-worker-10000ms',
        durationS: 20,
        offender: {
          kind: 'infinite_loop',
          mode: 'task',
          doseMs: 10000,
          execution: 'thread',
          killAfterMs: 10000,
        },
      },
      {
        name: 'post-termination-recovery',
        durationS: 20,
        offender: {
          kind: 'cpu_spin',
          mode: 'task',
          doseMs: 100,
          execution: 'thread',
          killAfterMs: 120000,
        },
      },
    ],
  },
  't1-field-caps-bytes': {
    name: 't1-field-caps-bytes',
    description:
      'Real field-caps task stream: main I/O pump, transferred bytes, worker decode/parse/real-fetcher shaping.',
    probe: { rps: 10, path: '/api/spaces/space' },
    laptopProbe: { rps: 2, path: '/api/spaces/space' },
    ticks: { intervalMs: 1000 },
    phases: [
      {
        name: 'seed',
        durationS: 5,
        action: 'seed',
        actionParams: {
          kind: 'field_caps',
          indices: 50,
          fieldsPerIndex: 2000,
          uniqueRatio: 0.5,
          conflictRatio: 0.2,
        },
      },
      { name: 'warmup', durationS: 15 },
      { name: 'baseline', durationS: 40 },
      ...(['main', 'thread', 'main', 'thread'] as const).map((execution, index) => ({
        name: `field-caps-${execution}-${index}`,
        durationS: 20,
        action: 'field-caps',
        actionParams: { repeat: 3, decompose: true, mode: 'task', execution },
      })),
    ],
  },
};
