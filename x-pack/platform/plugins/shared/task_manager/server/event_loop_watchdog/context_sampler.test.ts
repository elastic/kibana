/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partitionBlock } from './context_sampler';
import type { BlockAttribution, ContextSample, CurrentTaskContext } from './types';

const ms = (value: number) => value * 1000;
const task = (id: string): CurrentTaskContext => ({
  taskId: id,
  taskType: 'type',
  executionUuid: `uuid-${id}`,
});
const sample = (
  postedMs: number,
  landedMs: number | undefined,
  owner: CurrentTaskContext | null
): ContextSample => ({
  postedAtUs: ms(postedMs),
  landedAtUs: landedMs === undefined ? undefined : ms(landedMs),
  task: owner,
  missing: false,
});
const total = (a: BlockAttribution) =>
  a.unsampledMs + a.opaqueMs + a.noContextMs + a.perTask.reduce((sum, t) => sum + t.observedMs, 0);

describe('partitionBlock', () => {
  it('is entirely unsampled without samples', () => {
    const a = partitionBlock(0, ms(2000), []);
    expect(a).toMatchObject({ blockedMs: 2000, unsampledMs: 2000, opaqueMs: 0, samples: 0 });
    expect(a.perTask).toEqual([]);
  });

  it('credits a task that was current at every sample, and the partition adds up', () => {
    const a = partitionBlock(0, ms(2000), [
      sample(500, 501, task('a')),
      sample(751, 752, task('a')),
      sample(1002, 1003, task('a')),
      sample(1253, 1254, task('a')),
    ]);
    expect(a.perTask).toHaveLength(1);
    expect(a.perTask[0]).toMatchObject({ taskId: 'a', samples: 4 });
    expect(a.unsampledMs).toBeGreaterThanOrEqual(500);
    expect(a.opaqueMs).toBeCloseTo(4);
    expect(total(a)).toBeCloseTo(2000);
  });

  it('never credits time before a late landing to the task it names', () => {
    // Posted at 500 during one long native call that returns at 1900, where task b runs next.
    const a = partitionBlock(0, ms(2000), [sample(500, 1900, task('b'))]);
    expect(a.opaqueMs).toBeCloseTo(1400);
    expect(a.perTask[0].taskId).toBe('b');
    expect(a.perTask[0].observedMs).toBeCloseTo(100);
    expect(total(a)).toBeCloseTo(2000);
  });

  it('credits each interval to the task landed in, when the current task changes', () => {
    const a = partitionBlock(0, ms(2000), [
      sample(500, 501, task('a')),
      sample(751, 752, task('a')),
      sample(1002, 1003, task('b')),
      sample(1253, 1254, task('b')),
    ]);
    const byId = Object.fromEntries(a.perTask.map((t) => [t.taskId, t.observedMs]));
    // a: two intervals of ~250ms; b: one interval plus the capped tail after the last landing.
    expect(byId.a).toBeCloseTo(500, -1);
    expect(byId.b).toBeCloseTo(250 + 275, -1);
    expect(total(a)).toBeCloseTo(2000);
  });

  it('counts a sample still in flight at the end of the block as opaque', () => {
    const a = partitionBlock(0, ms(2000), [
      sample(500, 501, task('a')),
      sample(751, undefined, null),
    ]);
    expect(a.opaqueMs).toBeCloseTo(1 + 1249);
    expect(a.perTask[0].observedMs).toBeCloseTo(250);
    expect(total(a)).toBeCloseTo(2000);
  });

  it('reports opaque time bounded by the same task as inferred, without crediting it', () => {
    const a = partitionBlock(0, ms(2000), [
      sample(500, 600, task('a')),
      sample(700, 1500, task('a')),
    ]);
    expect(a.inferredMs).toBeCloseTo(800);
    expect(a.opaqueMs).toBeCloseTo(900);
    expect(a.perTask[0].observedMs).toBeLessThan(500);
  });

  it('credits at most one interval after the last landing, the rest is unsampled', () => {
    const a = partitionBlock(0, ms(10_000), [sample(500, 501, task('a'))]);
    expect(a.perTask[0].observedMs).toBeCloseTo(275);
    expect(a.unsampledMs).toBeCloseTo(500 + 10_000 - 501 - 275);
    expect(a.unsampledPrefixMs).toBeCloseTo(500);
    expect(a.unsampledTailMs).toBeCloseTo(10_000 - 501 - 275);
    expect(total(a)).toBeCloseTo(10_000);
  });

  it('accounts for time without a task context', () => {
    const a = partitionBlock(0, ms(2000), [sample(500, 501, null), sample(751, 752, null)]);
    expect(a.perTask).toEqual([]);
    expect(a.noContextMs).toBeGreaterThan(0);
  });

  it('reports a missing accessor', () => {
    const missing: ContextSample = {
      postedAtUs: ms(500),
      landedAtUs: ms(501),
      task: null,
      missing: true,
    };
    expect(partitionBlock(0, ms(1000), [missing]).missingAccessor).toBe(true);
  });

  it('sorts tasks by observed time and keys them by execution', () => {
    const first = { ...task('a'), executionUuid: 'run-1' };
    const second = { ...task('a'), executionUuid: 'run-2' };
    const a = partitionBlock(0, ms(2000), [
      sample(500, 501, first),
      sample(751, 752, second),
      sample(1002, 1003, second),
    ]);
    expect(a.perTask.map((t) => t.executionUuid)).toEqual(['run-2', 'run-1']);
  });
});
