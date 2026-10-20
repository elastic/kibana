/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISOLATED_SCENARIOS } from './isolated_scenarios';

it('has five matched idle/treatment pairs for each task execution arm and CPU dose', () => {
  const { phases } = ISOLATED_SCENARIOS['t1-serverless-pools'];
  expect(new Set(phases.map(({ name }) => name)).size).toBe(phases.length);
  for (const dose of [1000, 10000]) {
    for (const execution of ['main', 'thread']) {
      const active = phases.filter((phase) => phase.name.startsWith(`cpu-${dose}-${execution}-`));
      expect(active).toHaveLength(5);
      for (const phase of active) {
        expect(phase.offender).toMatchObject({
          kind: 'cpu_spin',
          mode: 'task',
          execution,
          doseMs: dose,
        });
        expect(phase.windowS).toBe(30);
        const before = phases[phases.indexOf(phase) - 1];
        expect(before.name).toBe(phase.name.replace('cpu-', 'idle-'));
        expect(before.durationS).toBe(30);
      }
    }
  }
});

it('primes the worker and requires independently supervised non-terminating work then recovery', () => {
  const { phases } = ISOLATED_SCENARIOS['t1-serverless-pools'];
  expect(phases.slice(-3).map(({ name }) => name)).toEqual([
    'worker-prime',
    'infinite-worker-supervised',
    'post-termination-recovery',
  ]);
  expect(phases.at(-2)?.offender).toMatchObject({
    mode: 'task',
    execution: 'thread',
    kind: 'infinite_loop',
    killAfterMs: 10000,
  });
});
