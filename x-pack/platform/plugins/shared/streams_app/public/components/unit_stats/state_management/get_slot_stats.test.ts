/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessingNodeRef } from '../../../services/unit_graph';
import type {
  ProcessorInstanceStatsView,
  ProcessorStatsView,
} from '../../../services/unit_stats_client/types';
import { getSlotStats } from './get_slot_stats';
import type { SlotStats } from './get_slot_stats';
import type { StatsEntry } from './types';

const SLOT: ProcessingNodeRef = { kind: 'route', pipelineId: 'main', routeIndex: 0 };

const instance = (
  eventsRate: number | null,
  durationAverage: number | null,
  routeIndex: number | null = 0
): ProcessorInstanceStatsView => ({
  pipelineId: 'main',
  routeIndex,
  eventsRate,
  failedRate: null,
  durationAverage,
});

const entryWith = (...instances: ProcessorInstanceStatsView[]): StatsEntry<ProcessorStatsView> => ({
  status: 'ready',
  stats: { instances },
});

const UNKNOWN: SlotStats = { status: 'unknown', eventsRate: null, durationAverage: null };

describe('getSlotStats', () => {
  describe('when there is nothing to show', () => {
    it.each<[string, Array<StatsEntry<ProcessorStatsView> | undefined>]>([
      ['the slot has no processors', []],
      ['a processor has no entry yet', [undefined]],
      ['a request is in flight', [{ status: 'loading' }]],
      [
        'a processor failed',
        [{ status: 'error', stats: { instances: [] }, error: { code: 'error', reason: 'x' } }],
      ],
      [
        'one processor of two is still loading',
        [entryWith(instance(10, 0.001)), { status: 'loading' }],
      ],
      [
        'one processor of two failed',
        [
          entryWith(instance(10, 0.001)),
          { status: 'error', stats: { instances: [] }, error: { code: 'error', reason: 'x' } },
        ],
      ],
    ])('is unknown when %s', (_description, entries) => {
      expect(getSlotStats(SLOT, entries)).toEqual(UNKNOWN);
    });
  });

  describe('a slot with one processor', () => {
    it('takes the rate and the time from its instance', () => {
      expect(getSlotStats(SLOT, [entryWith(instance(3700, 0.008))])).toEqual({
        status: 'ready',
        eventsRate: 3700,
        durationAverage: 0.008,
      });
    });

    it('is ready with no values when the processor has no data', () => {
      expect(getSlotStats(SLOT, [{ status: 'noData', stats: { instances: [] } }])).toEqual({
        status: 'ready',
        eventsRate: null,
        durationAverage: null,
      });
    });

    it('is ready with no values when the processor only ran elsewhere', () => {
      const elsewhere = entryWith(instance(500, 0.002, null), instance(900, 0.003, 4));

      expect(getSlotStats(SLOT, [elsewhere])).toEqual({
        status: 'ready',
        eventsRate: null,
        durationAverage: null,
      });
    });

    it('keeps a stale value as it is', () => {
      const stale: StatsEntry<ProcessorStatsView> = {
        status: 'stale',
        stats: { instances: [instance(3700, 0.008)] },
      };

      expect(getSlotStats(SLOT, [stale])).toEqual({
        status: 'ready',
        eventsRate: 3700,
        durationAverage: 0.008,
      });
    });

    it('shows a rate without a time when the duration is missing', () => {
      expect(getSlotStats(SLOT, [entryWith(instance(3700, null))])).toEqual({
        status: 'ready',
        eventsRate: 3700,
        durationAverage: null,
      });
    });
  });

  describe('a slot with several processors', () => {
    it('takes the rate of the first and adds up the times', () => {
      const entries = [entryWith(instance(1000, 0.002)), entryWith(instance(400, 0.006))];

      expect(getSlotStats(SLOT, entries)).toEqual({
        status: 'ready',
        eventsRate: 1000,
        durationAverage: 0.008,
      });
    });

    it('depends on the order the processors run in', () => {
      const first = entryWith(instance(1000, 0.002));
      const second = entryWith(instance(400, 0.006));

      expect(getSlotStats(SLOT, [first, second]).eventsRate).toBe(1000);
      expect(getSlotStats(SLOT, [second, first]).eventsRate).toBe(400);
    });

    it('has no time when any processor has none, and keeps the rate', () => {
      const entries = [entryWith(instance(1000, 0.002)), entryWith(instance(400, null))];

      expect(getSlotStats(SLOT, entries)).toEqual({
        status: 'ready',
        eventsRate: 1000,
        durationAverage: null,
      });
    });

    it('has no time when a later processor has no instance in the slot', () => {
      const entries = [
        entryWith(instance(1000, 0.002)),
        { status: 'noData' as const, stats: { instances: [] } },
      ];

      expect(getSlotStats(SLOT, entries)).toEqual({
        status: 'ready',
        eventsRate: 1000,
        durationAverage: null,
      });
    });

    it('has no rate when the first processor has no instance in the slot', () => {
      const entries = [
        { status: 'noData' as const, stats: { instances: [] } },
        entryWith(instance(400, 0.006)),
      ];

      expect(getSlotStats(SLOT, entries)).toEqual({
        status: 'ready',
        eventsRate: null,
        durationAverage: null,
      });
    });
  });

  it('reads the instance of the slot, not of another slot of the same pipeline', () => {
    const entry = entryWith(
      instance(100, 0.001, null),
      instance(200, 0.002, 0),
      instance(300, 0.003, 1)
    );

    expect(getSlotStats({ kind: 'pipeline', pipelineId: 'main' }, [entry]).eventsRate).toBe(100);
    expect(
      getSlotStats({ kind: 'route', pipelineId: 'main', routeIndex: 0 }, [entry]).eventsRate
    ).toBe(200);
    expect(
      getSlotStats({ kind: 'route', pipelineId: 'main', routeIndex: 1 }, [entry]).eventsRate
    ).toBe(300);
  });
});
