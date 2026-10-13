/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decideFlag } from './flag_rule';
import type { BlockAttribution } from './types';

const attribution = (overrides: Partial<BlockAttribution> = {}): BlockAttribution => ({
  blockedMs: 6000,
  unsampledMs: 500,
  unsampledPrefixMs: 500,
  unsampledTailMs: 0,
  opaqueMs: 20,
  inferredMs: 0,
  noContextMs: 0,
  samples: 20,
  missingAccessor: false,
  perTask: [{ taskId: 'a', taskType: 'type', executionUuid: 'u-a', observedMs: 5400, samples: 20 }],
  ...overrides,
});
const opts = { flagThresholdMs: 5000, minCpuRatio: 0.5 };
const decide = (a: BlockAttribution, cpu = 1) => decideFlag(a, cpu, 'start', 'end', opts);

describe('decideFlag', () => {
  it('flags the task that held the sampled part of the block, with evidence', () => {
    expect(decide(attribution())).toEqual({
      flagged: true,
      taskId: 'a',
      taskType: 'type',
      executionUuid: 'u-a',
      evidence: {
        blockedMs: 6000,
        observedMs: 5400,
        opaqueMs: 20,
        unsampledMs: 500,
        inferredMs: 0,
        samples: 20,
        cpuRatio: 1,
        startedAt: 'start',
        endedAt: 'end',
      },
    });
  });

  it('does not flag a block below the threshold', () => {
    expect(decide(attribution({ blockedMs: 4000 }))).toEqual({
      flagged: false,
      reason: 'below-threshold',
    });
  });

  it('does not flag when the process was not busy (throttled or starved node)', () => {
    expect(decide(attribution(), 0.1)).toEqual({ flagged: false, reason: 'cpu-starved' });
  });

  it('can disable the CPU gate', () => {
    expect(decideFlag(attribution(), 0, 's', 'e', { ...opts, minCpuRatio: 0 }).flagged).toBe(true);
  });

  it('does not flag without a sampled task, or when the accessor is missing', () => {
    expect(decide(attribution({ perTask: [], noContextMs: 5000, opaqueMs: 0 }))).toEqual({
      flagged: false,
      reason: 'no-context',
    });
    expect(decide(attribution({ missingAccessor: true }))).toEqual({
      flagged: false,
      reason: 'no-context',
    });
  });

  it('does not flag a block that is mostly opaque, even if the last landing names a task', () => {
    expect(
      decide(
        attribution({
          opaqueMs: 5000,
          perTask: [
            { taskId: 'b', taskType: 'type', executionUuid: 'u-b', observedMs: 275, samples: 1 },
          ],
        })
      )
    ).toEqual({ flagged: false, reason: 'opaque-dominated' });
  });

  it('does not flag a block that was never sampled', () => {
    expect(
      decide(
        attribution({
          samples: 0,
          perTask: [],
          unsampledMs: 6000,
          unsampledPrefixMs: 6000,
          opaqueMs: 0,
        })
      )
    ).toEqual({ flagged: false, reason: 'unsampled' });
  });

  it('does not pin a very long block on the task that ran while sampling lasted', () => {
    // A 60s block; sampling stopped after 10s, so 49s have no owner. The top task held all it saw.
    expect(
      decide(
        attribution({
          blockedMs: 60_000,
          unsampledMs: 49_500,
          unsampledPrefixMs: 500,
          unsampledTailMs: 49_000,
          opaqueMs: 0,
          perTask: [
            {
              taskId: 'a',
              taskType: 'type',
              executionUuid: 'u-a',
              observedMs: 10_000,
              samples: 40,
            },
          ],
        })
      )
    ).toEqual({ flagged: false, reason: 'unsampled' });
  });

  it('reports a block with no landed sample and opaque time as opaque-dominated', () => {
    expect(decide(attribution({ perTask: [], opaqueMs: 5400 }))).toEqual({
      flagged: false,
      reason: 'opaque-dominated',
    });
  });

  it('does not flag when several tasks shared the block', () => {
    expect(
      decide(
        attribution({
          opaqueMs: 0,
          perTask: [
            { taskId: 'a', taskType: 'type', executionUuid: 'u-a', observedMs: 2800, samples: 10 },
            { taskId: 'b', taskType: 'type', executionUuid: 'u-b', observedMs: 2700, samples: 10 },
          ],
        })
      )
    ).toEqual({ flagged: false, reason: 'multiple-contexts' });
  });

  it('accounts for the unsampled prefix at the threshold boundary', () => {
    // Required: 5000 - 500 - 250 = 4250 observed.
    const perTask = (observedMs: number) => [
      { taskId: 'a', taskType: 'type', executionUuid: 'u-a', observedMs, samples: 10 },
    ];
    expect(
      decide(attribution({ blockedMs: 5000, opaqueMs: 0, perTask: perTask(4250) })).flagged
    ).toBe(true);
    expect(
      decide(attribution({ blockedMs: 5000, opaqueMs: 0, perTask: perTask(4249) })).flagged
    ).toBe(false);
  });
});
