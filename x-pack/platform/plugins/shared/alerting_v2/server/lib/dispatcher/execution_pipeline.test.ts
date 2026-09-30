/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { DispatcherPipeline } from './execution_pipeline';
import { createDispatcherPipelineInput, createMockDispatcherStep } from './fixtures/test_utils';
import { EpisodeScan, EpisodeTriage } from './state';
import type { DispatcherPipelineState } from './types';

jest.mock('./with_dispatcher_span', () => ({
  withDispatcherSpan: (_name: string, cb: () => Promise<unknown>) => cb(),
}));

describe('DispatcherPipeline', () => {
  describe('execute', () => {
    it('executes all steps in order when all continue', async () => {
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

      const pipeline = new DispatcherPipeline([step1, step2, step3]);
      const input = createDispatcherPipelineInput();

      const result = await pipeline.execute(input, createLoggerService().loggerService);

      expect(result.completed).toBe(true);
      expect(result.haltReason).toBeUndefined();
      expect(executionOrder).toEqual(['step1', 'step2', 'step3']);
    });

    it('stops execution when a step returns halt', async () => {
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

      const pipeline = new DispatcherPipeline([step1, step2, step3]);
      const input = createDispatcherPipelineInput();

      const result = await pipeline.execute(input, createLoggerService().loggerService);

      expect(result.completed).toBe(false);
      expect(result.haltReason).toBe('no_episodes');
      expect(executionOrder).toEqual(['step1', 'step2']);
      expect(step3.execute).not.toHaveBeenCalled();
    });

    it('accumulates state across steps correctly', async () => {
      const statesReceived: DispatcherPipelineState[] = [];

      const step1 = createMockDispatcherStep('step1', async (state) => {
        statesReceived.push({ ...state });
        return { type: 'continue', data: { scan: EpisodeScan.empty() } };
      });

      const step2 = createMockDispatcherStep('step2', async (state) => {
        statesReceived.push({ ...state });
        return { type: 'continue', data: { triage: EpisodeTriage.empty() } };
      });

      const step3 = createMockDispatcherStep('step3', async (state) => {
        statesReceived.push({ ...state });
        return { type: 'continue' };
      });

      const pipeline = new DispatcherPipeline([step1, step2, step3]);
      const input = createDispatcherPipelineInput();

      const result = await pipeline.execute(input, createLoggerService().loggerService);

      expect(statesReceived[0]).toEqual({ input });
      expect(statesReceived[0].scan).toBeUndefined();

      expect(statesReceived[1].input).toEqual(input);
      expect(statesReceived[1].scan).toBeDefined();
      expect(statesReceived[1].triage).toBeUndefined();

      expect(statesReceived[2].input).toEqual(input);
      expect(statesReceived[2].scan).toBeDefined();
      expect(statesReceived[2].triage).toBeDefined();

      expect(result.finalState.scan).toBeDefined();
      expect(result.finalState.triage).toBeDefined();
    });

    it('propagates errors from steps', async () => {
      const step1 = createMockDispatcherStep('step1', async () => {
        throw new Error('Step failed');
      });

      const step2 = createMockDispatcherStep('step2', async () => {
        return { type: 'continue' };
      });

      const pipeline = new DispatcherPipeline([step1, step2]);
      const input = createDispatcherPipelineInput();

      await expect(pipeline.execute(input, createLoggerService().loggerService)).rejects.toThrow(
        'Step failed'
      );
      expect(step2.execute).not.toHaveBeenCalled();
    });

    it('returns completed result when no steps', async () => {
      const pipeline = new DispatcherPipeline([]);
      const input = createDispatcherPipelineInput();

      const result = await pipeline.execute(input, createLoggerService().loggerService);

      expect(result.completed).toBe(true);
      expect(result.finalState).toEqual({ input });
    });

    it('halts immediately with aborted when signal is already aborted before first step', async () => {
      const controller = new AbortController();
      controller.abort();

      const step1 = createMockDispatcherStep('step1', async () => ({ type: 'continue' }));

      const pipeline = new DispatcherPipeline([step1]);
      const input = createDispatcherPipelineInput({ signal: controller.signal });

      const result = await pipeline.execute(input, createLoggerService().loggerService);

      expect(result.completed).toBe(false);
      expect(result.haltReason).toBe('aborted');
      expect(step1.execute).not.toHaveBeenCalled();
    });

    it('halts between steps when signal is aborted after first step completes', async () => {
      const controller = new AbortController();

      const step1 = createMockDispatcherStep('step1', async () => {
        controller.abort();
        return { type: 'continue' };
      });

      const step2 = createMockDispatcherStep('step2', async () => ({ type: 'continue' }));

      const pipeline = new DispatcherPipeline([step1, step2]);
      const input = createDispatcherPipelineInput({ signal: controller.signal });

      const result = await pipeline.execute(input, createLoggerService().loggerService);

      expect(result.completed).toBe(false);
      expect(result.haltReason).toBe('aborted');
      expect(step1.execute).toHaveBeenCalledTimes(1);
      expect(step2.execute).not.toHaveBeenCalled();
    });
  });
});
