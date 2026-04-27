/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DispatcherPipeline } from './execution_pipeline';
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
});
