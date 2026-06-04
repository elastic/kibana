/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DispatcherPipeline, parallelGroup } from './execution_pipeline';
import type { DispatcherPipelineState } from './types';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { createDispatcherPipelineInput, createMockDispatcherStep } from './fixtures/test_utils';

jest.mock('./with_dispatcher_span', () => ({
  withDispatcherSpan: (_name: string, cb: () => Promise<unknown>) => cb(),
}));

describe('DispatcherPipeline', () => {
  describe('execute', () => {
    it('executes all steps in order when all continue', async () => {
      const { loggerService } = createLoggerService();
      const executionOrder: string[] = [];

      const step1 = createMockDispatcherStep('step1', async () => {
        executionOrder.push('step1');
        return { type: 'continue' };
      });

      const step2 = createMockDispatcherStep('step2', async () => {
        executionOrder.push('step2');
        return { type: 'continue' };
      });

      const step3 = createMockDispatcherStep('step3', async () => {
        executionOrder.push('step3');
        return { type: 'continue' };
      });

      const pipeline = new DispatcherPipeline(loggerService, [step1, step2, step3]);
      const input = createDispatcherPipelineInput();

      const result = await pipeline.execute(input);

      expect(result.completed).toBe(true);
      expect(result.haltReason).toBeUndefined();
      expect(executionOrder).toEqual(['step1', 'step2', 'step3']);
    });

    it('stops execution when a step returns halt', async () => {
      const { loggerService } = createLoggerService();
      const executionOrder: string[] = [];

      const step1 = createMockDispatcherStep('step1', async () => {
        executionOrder.push('step1');
        return { type: 'continue' };
      });

      const step2 = createMockDispatcherStep('step2', async () => {
        executionOrder.push('step2');
        return { type: 'halt', reason: 'no_episodes' };
      });

      const step3 = createMockDispatcherStep('step3', async () => {
        executionOrder.push('step3');
        return { type: 'continue' };
      });

      const pipeline = new DispatcherPipeline(loggerService, [step1, step2, step3]);
      const input = createDispatcherPipelineInput();

      const result = await pipeline.execute(input);

      expect(result.completed).toBe(false);
      expect(result.haltReason).toBe('no_episodes');
      expect(executionOrder).toEqual(['step1', 'step2']);
      expect(step3.execute).not.toHaveBeenCalled();
    });

    it('accumulates state across steps correctly', async () => {
      const { loggerService } = createLoggerService();
      const statesReceived: DispatcherPipelineState[] = [];

      const step1 = createMockDispatcherStep('step1', async (state) => {
        statesReceived.push({ ...state });
        return { type: 'continue', data: { episodes: [] } };
      });

      const step2 = createMockDispatcherStep('step2', async (state) => {
        statesReceived.push({ ...state });
        return { type: 'continue', data: { dispatchable: [], suppressed: [] } };
      });

      const step3 = createMockDispatcherStep('step3', async (state) => {
        statesReceived.push({ ...state });
        return { type: 'continue' };
      });

      const pipeline = new DispatcherPipeline(loggerService, [step1, step2, step3]);
      const input = createDispatcherPipelineInput();

      const result = await pipeline.execute(input);

      expect(statesReceived[0]).toEqual({ input });
      expect(statesReceived[0].episodes).toBeUndefined();

      expect(statesReceived[1].input).toEqual(input);
      expect(statesReceived[1].episodes).toBeDefined();
      expect(statesReceived[1].dispatchable).toBeUndefined();

      expect(statesReceived[2].input).toEqual(input);
      expect(statesReceived[2].episodes).toBeDefined();
      expect(statesReceived[2].dispatchable).toBeDefined();

      expect(result.finalState.episodes).toBeDefined();
      expect(result.finalState.dispatchable).toBeDefined();
    });

    it('converts a thrown step into a step_error halt and stops execution', async () => {
      const { loggerService, mockLogger } = createLoggerService();

      const step1 = createMockDispatcherStep('fetch_episodes', async () => ({
        type: 'continue',
        data: {
          episodes: [{ rule_id: 'r', group_hash: 'g', episode_id: 'e1' } as any],
        },
      }));
      const failingStep = createMockDispatcherStep('apply_suppression', async () => {
        const err = new TypeError('boom');
        throw err;
      });
      const step3 = createMockDispatcherStep('fetch_rules', async () => ({ type: 'continue' }));

      const pipeline = new DispatcherPipeline(loggerService, [step1, failingStep, step3]);
      const input = createDispatcherPipelineInput();

      const result = await pipeline.execute(input);

      expect(result.completed).toBe(false);
      expect(result.haltReason).toBe('step_error');
      expect(step3.execute).not.toHaveBeenCalled();

      expect(result.stageTimings).toHaveLength(2);
      expect(result.stageTimings[0]).toMatchObject({ name: 'fetch_episodes', halted: false });
      expect(result.stageTimings[0].error).toBeUndefined();

      const failed = result.stageTimings[1];
      expect(failed).toMatchObject({
        name: 'apply_suppression',
        halted: true,
        error: { type: 'TypeError', message: 'boom' },
      });
      // State reached by the prior successful step is preserved.
      expect(failed.counts.episodes).toBe(1);
      expect(result.finalState.episodes).toHaveLength(1);

      // The exception is also surfaced at error level with a stack trace
      // so operators can filter on log.level=ERROR without parsing tick meta.
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'boom',
        expect.objectContaining({
          error: expect.objectContaining({ type: 'dispatcher:apply_suppression' }),
        })
      );
    });

    it('wraps non-Error throws with a synthetic Error and still halts cleanly', async () => {
      const { loggerService } = createLoggerService();

      const step = createMockDispatcherStep('fetch_episodes', async () => {
        // eslint-disable-next-line no-throw-literal
        throw 'just a string';
      });

      const pipeline = new DispatcherPipeline(loggerService, [step]);
      const result = await pipeline.execute(createDispatcherPipelineInput());

      expect(result.completed).toBe(false);
      expect(result.haltReason).toBe('step_error');
      expect(result.stageTimings[0].error).toEqual({
        type: 'Error',
        message: 'just a string',
      });
    });

    it('returns completed result when no steps', async () => {
      const { loggerService } = createLoggerService();
      const pipeline = new DispatcherPipeline(loggerService, []);
      const input = createDispatcherPipelineInput();

      const result = await pipeline.execute(input);

      expect(result.completed).toBe(true);
      expect(result.finalState).toEqual({ input });
      expect(result.stageTimings).toEqual([]);
    });

    it('captures a timing entry for every executed step with post-step counts', async () => {
      const { loggerService } = createLoggerService();

      const step1 = createMockDispatcherStep('fetch_episodes', async () => ({
        type: 'continue',
        data: {
          episodes: [
            { rule_id: 'r', group_hash: 'g', episode_id: 'e1' } as any,
            { rule_id: 'r', group_hash: 'g', episode_id: 'e2' } as any,
          ],
        },
      }));
      const step2 = createMockDispatcherStep('fetch_suppressions', async () => ({
        type: 'continue',
        data: {
          suppressions: [{ rule_id: 'r', group_hash: 'g', episode_id: 'e1' } as any],
        },
      }));

      const pipeline = new DispatcherPipeline(loggerService, [step1, step2]);
      const input = createDispatcherPipelineInput();

      const result = await pipeline.execute(input);

      expect(result.stageTimings).toHaveLength(2);
      expect(result.stageTimings[0]).toMatchObject({
        name: 'fetch_episodes',
        halted: false,
        counts: { episodes: 2, suppressions: 0 },
      });
      expect(result.stageTimings[0].duration_ms).toBeGreaterThanOrEqual(0);
      expect(result.stageTimings[1]).toMatchObject({
        name: 'fetch_suppressions',
        halted: false,
        counts: { episodes: 2, suppressions: 1 },
      });
    });

    it('applies state data from a halt output so downstream consumers can read it on the finalState', async () => {
      // `fetch_episodes` halts with `no_episodes` but still publishes
      // `nextEventWatermark` on the way out — that field must survive on
      // `finalState` even though the pipeline did not continue.
      const { loggerService } = createLoggerService();

      const haltingStep = createMockDispatcherStep('fetch_episodes', async () => ({
        type: 'halt',
        reason: 'no_episodes',
        data: { nextEventWatermark: '2026-01-22T07:31:00.000Z' },
      }));

      const pipeline = new DispatcherPipeline(loggerService, [haltingStep]);
      const result = await pipeline.execute(createDispatcherPipelineInput());

      expect(result.completed).toBe(false);
      expect(result.haltReason).toBe('no_episodes');
      expect(result.finalState.nextEventWatermark).toBe('2026-01-22T07:31:00.000Z');
    });

    it('records the halting step with halted=true and no further stage timings', async () => {
      const { loggerService } = createLoggerService();

      const step1 = createMockDispatcherStep('fetch_episodes', async () => ({
        type: 'continue',
        data: { episodes: [] },
      }));
      const step2 = createMockDispatcherStep('fetch_suppressions', async () => ({
        type: 'halt',
        reason: 'no_episodes',
      }));
      const step3 = createMockDispatcherStep('apply_suppression', async () => ({
        type: 'continue',
      }));

      const pipeline = new DispatcherPipeline(loggerService, [step1, step2, step3]);
      const result = await pipeline.execute(createDispatcherPipelineInput());

      expect(result.completed).toBe(false);
      expect(result.haltReason).toBe('no_episodes');
      expect(result.stageTimings).toHaveLength(2);
      expect(result.stageTimings[0]).toMatchObject({ name: 'fetch_episodes', halted: false });
      expect(result.stageTimings[1]).toMatchObject({ name: 'fetch_suppressions', halted: true });
    });

    it('counts Map-sized state fields (rules, policies)', async () => {
      const { loggerService } = createLoggerService();
      const rules = new Map<string, any>([
        ['r1', { id: 'r1' }],
        ['r2', { id: 'r2' }],
        ['r3', { id: 'r3' }],
      ]);
      const policies = new Map<string, any>([['p1', { id: 'p1' }]]);

      const step = createMockDispatcherStep('fetch_rules_and_policies', async () => ({
        type: 'continue',
        data: { rules, policies },
      }));

      const pipeline = new DispatcherPipeline(loggerService, [step]);
      const result = await pipeline.execute(createDispatcherPipelineInput());

      expect(result.stageTimings[0].counts).toMatchObject({ rules: 3, policies: 1 });
    });
  });

  describe('parallel groups', () => {
    /**
     * Two-party rendezvous. Each side awaits the other's `arrive()` before
     * resolving; a serial executor would deadlock. Used to prove children
     * run concurrently without depending on wall-clock timing, which is
     * notoriously flaky in CI.
     */
    const createBarrier = () => {
      let resolveA!: () => void;
      let resolveB!: () => void;
      const arrivedA = new Promise<void>((resolve) => {
        resolveA = resolve;
      });
      const arrivedB = new Promise<void>((resolve) => {
        resolveB = resolve;
      });
      return {
        partyA: { arrive: () => resolveA(), waitForOther: () => arrivedB },
        partyB: { arrive: () => resolveB(), waitForOther: () => arrivedA },
      };
    };

    it('runs all children of a parallel group concurrently', async () => {
      const { loggerService } = createLoggerService();
      const { partyA, partyB } = createBarrier();

      const stepA = createMockDispatcherStep('a', async () => {
        partyA.arrive();
        await partyA.waitForOther();
        return { type: 'continue', data: { episodes: [] } };
      });
      const stepB = createMockDispatcherStep('b', async () => {
        partyB.arrive();
        await partyB.waitForOther();
        return { type: 'continue', data: { policies: new Map() } };
      });

      const pipeline = new DispatcherPipeline(loggerService, [parallelGroup(stepA, stepB)]);

      // If the children executed serially, the first one would block
      // forever waiting for the second to arrive — this assertion would
      // time out instead of completing. Successful resolution IS the
      // proof of concurrency.
      const result = await pipeline.execute(createDispatcherPipelineInput());

      expect(result.completed).toBe(true);
    });

    it('appends stage timings in declaration order, not finish order', async () => {
      const { loggerService } = createLoggerService();

      // `slow` is declared first but resolves after `fast`. Ordering in
      // stageTimings must follow declaration order so downstream consumers
      // (tick_summary.totals, ES|QL aggregations) see a deterministic shape.
      const fastDone = Promise.resolve();
      const slow = createMockDispatcherStep('slow', async () => {
        await fastDone;
        await new Promise<void>((resolve) => setImmediate(resolve));
        return { type: 'continue' };
      });
      const fast = createMockDispatcherStep('fast', async () => {
        return { type: 'continue' };
      });

      const pipeline = new DispatcherPipeline(loggerService, [parallelGroup(slow, fast)]);
      const result = await pipeline.execute(createDispatcherPipelineInput());

      expect(result.stageTimings.map((t) => t.name)).toEqual(['slow', 'fast']);
    });

    it('merges all continue outputs into the next state in declaration order', async () => {
      const { loggerService } = createLoggerService();

      const stepA = createMockDispatcherStep('a', async () => ({
        type: 'continue',
        data: { episodes: [{ rule_id: 'r' } as any] },
      }));
      const stepB = createMockDispatcherStep('b', async () => ({
        type: 'continue',
        data: { policies: new Map([['p1', { id: 'p1' } as any]]) },
      }));

      const pipeline = new DispatcherPipeline(loggerService, [parallelGroup(stepA, stepB)]);
      const result = await pipeline.execute(createDispatcherPipelineInput());

      expect(result.completed).toBe(true);
      expect(result.finalState.episodes).toHaveLength(1);
      expect(result.finalState.policies?.size).toBe(1);
    });

    it('exposes the same pre-group state snapshot to every child', async () => {
      const { loggerService } = createLoggerService();
      const seenStates: DispatcherPipelineState[] = [];

      const seed = createMockDispatcherStep('seed', async () => ({
        type: 'continue',
        data: { episodes: [{ rule_id: 'r' } as any] },
      }));
      const childA = createMockDispatcherStep('a', async (state) => {
        seenStates.push(state);
        return { type: 'continue', data: { policies: new Map() } };
      });
      const childB = createMockDispatcherStep('b', async (state) => {
        seenStates.push(state);
        return { type: 'continue', data: { rules: new Map() } };
      });

      const pipeline = new DispatcherPipeline(loggerService, [seed, parallelGroup(childA, childB)]);
      await pipeline.execute(createDispatcherPipelineInput());

      // Both children see the seeded `episodes` but neither sees the
      // sibling's contribution. This is what guarantees concurrency safety.
      expect(seenStates).toHaveLength(2);
      expect(seenStates[0].episodes).toHaveLength(1);
      expect(seenStates[1].episodes).toHaveLength(1);
      expect(seenStates[0].policies).toBeUndefined();
      expect(seenStates[0].rules).toBeUndefined();
      expect(seenStates[1].policies).toBeUndefined();
      expect(seenStates[1].rules).toBeUndefined();
    });

    it('halts the pipeline when any child halts, with declaration-order precedence', async () => {
      const { loggerService } = createLoggerService();

      const halting = createMockDispatcherStep('halting', async () => ({
        type: 'halt',
        reason: 'no_episodes',
      }));
      const succeeding = createMockDispatcherStep('succeeding', async () => ({
        type: 'continue',
        data: { policies: new Map() },
      }));
      const downstream = createMockDispatcherStep('downstream', async () => ({
        type: 'continue',
      }));

      const pipeline = new DispatcherPipeline(loggerService, [
        parallelGroup(halting, succeeding),
        downstream,
      ]);
      const result = await pipeline.execute(createDispatcherPipelineInput());

      expect(result.completed).toBe(false);
      expect(result.haltReason).toBe('no_episodes');
      expect(result.stageTimings.map((t) => t.name)).toEqual(['halting', 'succeeding']);
      expect(result.stageTimings[0].halted).toBe(true);
      expect(result.stageTimings[1].halted).toBe(false);
      expect(downstream.execute).not.toHaveBeenCalled();
    });

    it('halts on step_error when any child throws, both children still recorded', async () => {
      const { loggerService } = createLoggerService();

      const throwing = createMockDispatcherStep('throwing', async () => {
        throw new TypeError('child boom');
      });
      const succeeding = createMockDispatcherStep('succeeding', async () => ({
        type: 'continue',
        data: { policies: new Map() },
      }));
      const downstream = createMockDispatcherStep('downstream', async () => ({
        type: 'continue',
      }));

      const pipeline = new DispatcherPipeline(loggerService, [
        parallelGroup(throwing, succeeding),
        downstream,
      ]);
      const result = await pipeline.execute(createDispatcherPipelineInput());

      expect(result.completed).toBe(false);
      expect(result.haltReason).toBe('step_error');
      expect(result.stageTimings).toHaveLength(2);
      expect(result.stageTimings[0]).toMatchObject({
        name: 'throwing',
        halted: true,
        error: { type: 'TypeError', message: 'child boom' },
      });
      expect(result.stageTimings[1]).toMatchObject({ name: 'succeeding', halted: false });
      // The successful sibling's state contribution is still merged onto
      // finalState — observers can rely on "every started step's delta
      // reaches finalState unless the step itself failed".
      expect(result.finalState.policies).toBeDefined();
      expect(downstream.execute).not.toHaveBeenCalled();
    });

    it('records both children timings even when both throw', async () => {
      const { loggerService } = createLoggerService();

      const throwingA = createMockDispatcherStep('a', async () => {
        throw new Error('a boom');
      });
      const throwingB = createMockDispatcherStep('b', async () => {
        throw new Error('b boom');
      });

      const pipeline = new DispatcherPipeline(loggerService, [parallelGroup(throwingA, throwingB)]);
      const result = await pipeline.execute(createDispatcherPipelineInput());

      expect(result.completed).toBe(false);
      // Declaration order picks the first throw as the surfaced halt reason.
      expect(result.haltReason).toBe('step_error');
      expect(result.stageTimings).toHaveLength(2);
      expect(result.stageTimings[0]).toMatchObject({
        name: 'a',
        halted: true,
        error: { message: 'a boom' },
      });
      expect(result.stageTimings[1]).toMatchObject({
        name: 'b',
        halted: true,
        error: { message: 'b boom' },
      });
    });

    it('preserves data published alongside a halt from a child', async () => {
      const { loggerService } = createLoggerService();

      const halting = createMockDispatcherStep('halting', async () => ({
        type: 'halt',
        reason: 'no_episodes',
        data: { nextEventWatermark: '2026-01-22T07:31:00.000Z' },
      }));
      const succeeding = createMockDispatcherStep('succeeding', async () => ({
        type: 'continue',
        data: { policies: new Map() },
      }));

      const pipeline = new DispatcherPipeline(loggerService, [parallelGroup(halting, succeeding)]);
      const result = await pipeline.execute(createDispatcherPipelineInput());

      expect(result.haltReason).toBe('no_episodes');
      expect(result.finalState.nextEventWatermark).toBe('2026-01-22T07:31:00.000Z');
      // The non-halting sibling's delta is still merged.
      expect(result.finalState.policies).toBeDefined();
    });

    it('executes mixed serial and parallel entries in declared order', async () => {
      const { loggerService } = createLoggerService();
      const order: string[] = [];

      const before = createMockDispatcherStep('before', async () => {
        order.push('before');
        return { type: 'continue' };
      });
      const parA = createMockDispatcherStep('parA', async () => {
        order.push('parA');
        return { type: 'continue', data: { episodes: [] } };
      });
      const parB = createMockDispatcherStep('parB', async () => {
        order.push('parB');
        return { type: 'continue', data: { policies: new Map() } };
      });
      const after = createMockDispatcherStep('after', async () => {
        order.push('after');
        return { type: 'continue' };
      });

      const pipeline = new DispatcherPipeline(loggerService, [
        before,
        parallelGroup(parA, parB),
        after,
      ]);
      const result = await pipeline.execute(createDispatcherPipelineInput());

      expect(result.completed).toBe(true);
      // 'before' must finish before the group starts; 'after' must start
      // only after both group children settle. The relative order of parA
      // and parB within the group is unconstrained by execution but
      // stageTimings still records them in declaration order.
      expect(order[0]).toBe('before');
      expect(order[order.length - 1]).toBe('after');
      expect(order.slice(1, 3).sort()).toEqual(['parA', 'parB']);

      expect(result.stageTimings.map((t) => t.name)).toEqual(['before', 'parA', 'parB', 'after']);
    });

    it('a serial step after a parallel group sees the merged state from the group', async () => {
      const { loggerService } = createLoggerService();
      let observed: DispatcherPipelineState | undefined;

      const parA = createMockDispatcherStep('parA', async () => ({
        type: 'continue',
        data: { episodes: [{ rule_id: 'r' } as any] },
      }));
      const parB = createMockDispatcherStep('parB', async () => ({
        type: 'continue',
        data: { policies: new Map([['p1', { id: 'p1' } as any]]) },
      }));
      const downstream = createMockDispatcherStep('downstream', async (state) => {
        observed = state;
        return { type: 'continue' };
      });

      const pipeline = new DispatcherPipeline(loggerService, [
        parallelGroup(parA, parB),
        downstream,
      ]);
      await pipeline.execute(createDispatcherPipelineInput());

      expect(observed?.episodes).toHaveLength(1);
      expect(observed?.policies?.size).toBe(1);
    });
  });
});
