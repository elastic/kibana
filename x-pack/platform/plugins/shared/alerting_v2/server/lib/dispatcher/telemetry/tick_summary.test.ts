/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import type { DispatcherStageTiming, DispatcherTickSummary } from './types';
import { buildTickSummary, emitTickSummary } from './tick_summary';

const STAGE_ZERO_COUNTS = {
  episodes: 0,
  suppressions: 0,
  dispatchable: 0,
  suppressed: 0,
  rules: 0,
  policies: 0,
  matched: 0,
  groups: 0,
  dispatch: 0,
  throttled: 0,
};

describe('telemetry/tick_summary', () => {
  describe('buildTickSummary', () => {
    let hrtimeSpy: jest.SpyInstance<bigint, []>;

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:05.000Z'));
    });

    afterEach(() => {
      hrtimeSpy?.mockRestore();
      jest.useRealTimers();
    });

    it('emits ISO-8601 timestamps and derives duration_ms from the monotonic clock', () => {
      // origin = 0, "now" = 12.345 ms after origin
      hrtimeSpy = jest.spyOn(process.hrtime, 'bigint').mockReturnValueOnce(12_345_000n);

      const tick = buildTickSummary({
        startedAt: new Date('2026-01-01T00:00:00.000Z'),
        startedAtNs: 0n,
        previousStartedAt: new Date('2025-12-31T23:59:00.000Z'),
        completed: true,
        haltReason: null,
        stages: [],
      });

      expect(tick).toEqual<DispatcherTickSummary>({
        started_at: '2026-01-01T00:00:00.000Z',
        finished_at: '2026-01-01T00:00:05.000Z',
        duration_ms: 12.345,
        previous_started_at: '2025-12-31T23:59:00.000Z',
        completed: true,
        halt_reason: null,
        stages: [],
        totals: STAGE_ZERO_COUNTS,
      });
    });

    it('totals roll up the last stages counts so metric aggs do not flatten the array', () => {
      hrtimeSpy = jest.spyOn(process.hrtime, 'bigint').mockReturnValueOnce(1_000_000n);
      const stages: DispatcherStageTiming[] = [
        {
          name: 'fetch_episodes',
          duration_ms: 1,
          halted: false,
          counts: { ...STAGE_ZERO_COUNTS, episodes: 42 },
        },
        {
          name: 'apply_suppression',
          duration_ms: 1,
          halted: false,
          counts: { ...STAGE_ZERO_COUNTS, episodes: 42, dispatchable: 40, suppressed: 2 },
        },
      ];

      const tick = buildTickSummary({
        startedAt: new Date('2026-01-01T00:00:00Z'),
        startedAtNs: 0n,
        previousStartedAt: new Date('2026-01-01T00:00:00Z'),
        completed: true,
        haltReason: null,
        stages,
      });

      expect(tick.totals).toEqual({
        ...STAGE_ZERO_COUNTS,
        episodes: 42,
        dispatchable: 40,
        suppressed: 2,
      });
    });

    it('totals reflect the halting stage when the tick halts early', () => {
      hrtimeSpy = jest.spyOn(process.hrtime, 'bigint').mockReturnValueOnce(500_000n);
      const stages: DispatcherStageTiming[] = [
        {
          name: 'fetch_episodes',
          duration_ms: 0.5,
          halted: true,
          counts: { ...STAGE_ZERO_COUNTS, episodes: 7 },
          error: { type: 'Error', message: 'boom' },
        },
      ];

      const tick = buildTickSummary({
        startedAt: new Date('2026-01-01T00:00:00Z'),
        startedAtNs: 0n,
        previousStartedAt: new Date('2026-01-01T00:00:00Z'),
        completed: false,
        haltReason: 'step_error',
        stages,
      });

      expect(tick.totals).toEqual({ ...STAGE_ZERO_COUNTS, episodes: 7 });
    });

    it('rounds duration_ms to 3 decimals', () => {
      // 1.2345678 ms → 1.235
      hrtimeSpy = jest.spyOn(process.hrtime, 'bigint').mockReturnValueOnce(1_234_567n);
      const tick = buildTickSummary({
        startedAt: new Date('2026-01-01T00:00:00Z'),
        startedAtNs: 0n,
        previousStartedAt: new Date('2026-01-01T00:00:00Z'),
        completed: true,
        haltReason: null,
        stages: [],
      });
      expect(tick.duration_ms).toBe(1.235);
    });

    it('tick.duration_ms is >= sum(stages.duration_ms) — clocks are aligned', () => {
      const stages: DispatcherStageTiming[] = [
        { name: 's1', duration_ms: 3, halted: false, counts: STAGE_ZERO_COUNTS },
        { name: 's2', duration_ms: 7, halted: false, counts: STAGE_ZERO_COUNTS },
      ];
      // tick total = 12 ms, stages sum to 10 ms — reasonable overhead
      hrtimeSpy = jest.spyOn(process.hrtime, 'bigint').mockReturnValueOnce(12_000_000n);

      const tick = buildTickSummary({
        startedAt: new Date('2026-01-01T00:00:00Z'),
        startedAtNs: 0n,
        previousStartedAt: new Date('2026-01-01T00:00:00Z'),
        completed: true,
        haltReason: null,
        stages,
      });

      const stageSum = stages.reduce((acc, s) => acc + s.duration_ms, 0);
      expect(tick.duration_ms).toBeGreaterThanOrEqual(stageSum);
    });

    it('preserves stages and halt_reason verbatim', () => {
      hrtimeSpy = jest.spyOn(process.hrtime, 'bigint').mockReturnValueOnce(1_000_000n);
      const stages: DispatcherStageTiming[] = [
        {
          name: 'fetch_episodes',
          duration_ms: 0.5,
          halted: true,
          counts: STAGE_ZERO_COUNTS,
          error: { type: 'Error', message: 'oops' },
        },
      ];

      const tick = buildTickSummary({
        startedAt: new Date('2026-01-01T00:00:00Z'),
        startedAtNs: 0n,
        previousStartedAt: new Date('2026-01-01T00:00:00Z'),
        completed: false,
        haltReason: 'step_error',
        stages,
      });

      expect(tick.halt_reason).toBe('step_error');
      expect(tick.completed).toBe(false);
      expect(tick.stages).toBe(stages);
    });
  });

  describe('emitTickSummary', () => {
    const baseTick: DispatcherTickSummary = {
      started_at: '2026-01-01T00:00:00.000Z',
      finished_at: '2026-01-01T00:00:00.100Z',
      duration_ms: 100,
      previous_started_at: '2025-12-31T23:59:00.000Z',
      completed: true,
      halt_reason: null,
      stages: [],
      totals: STAGE_ZERO_COUNTS,
    };

    it('logs at info with the fixed "dispatcher tick complete" message', () => {
      const logger = { info: jest.fn() } as unknown as LoggerServiceContract;
      emitTickSummary(logger, baseTick);

      expect(logger.info).toHaveBeenCalledTimes(1);
      expect((logger.info as jest.Mock).mock.calls[0][0].message).toBe('dispatcher tick complete');
    });

    it('nests the tick under kibana.alerting_v2.dispatcher.tick', () => {
      const logger = { info: jest.fn() } as unknown as LoggerServiceContract;
      emitTickSummary(logger, baseTick);

      const [{ meta }] = (logger.info as jest.Mock).mock.calls[0];
      expect(meta).toEqual({
        kibana: {
          alerting_v2: {
            dispatcher: { tick: baseTick },
          },
        },
      });
    });

    it('does not mutate the tick payload', () => {
      const logger = { info: jest.fn() } as unknown as LoggerServiceContract;
      const snapshot = JSON.stringify(baseTick);
      emitTickSummary(logger, baseTick);
      expect(JSON.stringify(baseTick)).toBe(snapshot);
    });
  });
});
