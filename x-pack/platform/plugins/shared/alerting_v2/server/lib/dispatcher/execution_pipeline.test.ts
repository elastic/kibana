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

    it('propagates errors from steps', async () => {
      const { loggerService } = createLoggerService();

      const step1 = createMockDispatcherStep('step1', async () => {
        throw new Error('Step failed');
      });

      const step2 = createMockDispatcherStep('step2', async () => {
        return { type: 'continue' };
      });

      const pipeline = new DispatcherPipeline(loggerService, [step1, step2]);
      const input = createDispatcherPipelineInput();

      await expect(pipeline.execute(input)).rejects.toThrow('Step failed');
      expect(step2.execute).not.toHaveBeenCalled();
    });

    it('returns completed result when no steps', async () => {
      const { loggerService } = createLoggerService();
      const pipeline = new DispatcherPipeline(loggerService, []);
      const input = createDispatcherPipelineInput();

      const result = await pipeline.execute(input);

      expect(result.completed).toBe(true);
      expect(result.finalState).toEqual({ input });
    });
  });
});
