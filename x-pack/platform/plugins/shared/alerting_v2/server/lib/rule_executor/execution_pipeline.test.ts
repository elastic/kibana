/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionPipeline } from './execution_pipeline';
import type {
  RuleExecutionInput,
  RuleExecutionStep,
  RulePipelineState,
  RuleStepOutput,
} from './types';
import { continueWith, continueExecution, halt } from './types';
import type { StepMiddleware } from './middleware';
import { createMockLoggerService } from '../services/logger_service/logger_service.mock';

describe('RuleExecutionPipeline', () => {
  const createExecutionInput = (
    overrides: Partial<RuleExecutionInput> = {}
  ): RuleExecutionInput => ({
    ruleId: 'rule-1',
    spaceId: 'default',
    scheduledAt: '2025-01-01T00:00:00.000Z',
    abortSignal: new AbortController().signal,
    ...overrides,
  });

  const createMockStep = (
    name: string,
    executeFn: (state: Readonly<RulePipelineState>) => Promise<RuleStepOutput>
  ): RuleExecutionStep => ({
    name,
    execute: jest.fn(executeFn),
  });

  describe('execute', () => {
    it('executes all steps in order when all continue', async () => {
      const { loggerService } = createMockLoggerService();
      const executionOrder: string[] = [];

      const step1 = createMockStep('step1', async () => {
        executionOrder.push('step1');
        return continueWith({ rule: { id: 'rule-1' } as any });
      });

      const step2 = createMockStep('step2', async () => {
        executionOrder.push('step2');
        return continueExecution();
      });

      const step3 = createMockStep('step3', async () => {
        executionOrder.push('step3');
        return continueWith({ alertEvents: [] });
      });

      const pipeline = new RuleExecutionPipeline(loggerService, [step1, step2, step3], []);
      const input = createExecutionInput();

      const result = await pipeline.execute(input);

      expect(result.completed).toBe(true);
      expect(result.haltReason).toBeUndefined();
      expect(executionOrder).toEqual(['step1', 'step2', 'step3']);
    });

    it('stops execution when a step returns halt', async () => {
      const { loggerService } = createMockLoggerService();
      const executionOrder: string[] = [];

      const step1 = createMockStep('step1', async () => {
        executionOrder.push('step1');
        return continueExecution();
      });

      const step2 = createMockStep('step2', async () => {
        executionOrder.push('step2');
        return halt('rule_deleted');
      });

      const step3 = createMockStep('step3', async () => {
        executionOrder.push('step3');
        return continueExecution();
      });

      const pipeline = new RuleExecutionPipeline(loggerService, [step1, step2, step3], []);
      const input = createExecutionInput();

      const result = await pipeline.execute(input);

      expect(result.completed).toBe(false);
      expect(result.haltReason).toBe('rule_deleted');
      expect(executionOrder).toEqual(['step1', 'step2']);
      expect(step3.execute).not.toHaveBeenCalled();
    });

    it('accumulates state immutably across steps', async () => {
      const { loggerService } = createMockLoggerService();
      const statesReceived: RulePipelineState[] = [];

      const step1 = createMockStep('step1', async (state) => {
        statesReceived.push({ ...state });
        return continueWith({ rule: { id: 'rule-1' } as any });
      });

      const step2 = createMockStep('step2', async (state) => {
        statesReceived.push({ ...state });
        return continueWith({
          queryPayload: { filter: {}, params: [], dateStart: '', dateEnd: '' },
        });
      });

      const step3 = createMockStep('step3', async (state) => {
        statesReceived.push({ ...state });
        return continueExecution();
      });

      const pipeline = new RuleExecutionPipeline(loggerService, [step1, step2, step3], []);
      const input = createExecutionInput();

      const result = await pipeline.execute(input);

      // Step 1 receives only input
      expect(statesReceived[0]).toEqual({ input });
      expect(statesReceived[0].rule).toBeUndefined();

      // Step 2 receives input + rule from step 1
      expect(statesReceived[1].input).toEqual(input);
      expect(statesReceived[1].rule).toBeDefined();
      expect(statesReceived[1].queryPayload).toBeUndefined();

      // Step 3 receives input + rule + queryPayload
      expect(statesReceived[2].input).toEqual(input);
      expect(statesReceived[2].rule).toBeDefined();
      expect(statesReceived[2].queryPayload).toBeDefined();

      // Final state includes all accumulated data
      expect(result.finalState.rule).toBeDefined();
      expect(result.finalState.queryPayload).toBeDefined();
    });

    it('propagates errors from steps', async () => {
      const { loggerService } = createMockLoggerService();
      const error = new Error('Step failed');

      const step1 = createMockStep('step1', async () => {
        throw error;
      });

      const step2 = createMockStep('step2', async () => {
        return continueExecution();
      });

      const pipeline = new RuleExecutionPipeline(loggerService, [step1, step2], []);
      const input = createExecutionInput();

      await expect(pipeline.execute(input)).rejects.toThrow('Step failed');
      expect(step2.execute).not.toHaveBeenCalled();
    });

    it('returns empty completed result when no steps', async () => {
      const { loggerService } = createMockLoggerService();
      const pipeline = new RuleExecutionPipeline(loggerService, [], []);
      const input = createExecutionInput();

      const result = await pipeline.execute(input);

      expect(result.completed).toBe(true);
      expect(result.finalState).toEqual({ input });
    });

    it('logs step execution', async () => {
      const { loggerService } = createMockLoggerService();

      const step1 = createMockStep('my_step', async () => continueExecution());

      const pipeline = new RuleExecutionPipeline(loggerService, [step1], []);
      const input = createExecutionInput();

      await pipeline.execute(input);

      expect(loggerService.debug).toHaveBeenCalledWith({
        message: 'Executing step: my_step',
      });
    });

    it('logs halt reason when pipeline halts', async () => {
      const { loggerService } = createMockLoggerService();

      const step1 = createMockStep('halt_step', async () => halt('rule_disabled'));

      const pipeline = new RuleExecutionPipeline(loggerService, [step1], []);
      const input = createExecutionInput();

      await pipeline.execute(input);

      expect(loggerService.debug).toHaveBeenCalledWith({
        message: 'Pipeline halted at step: halt_step, reason: rule_disabled',
      });
    });

    it('executes middleware chain around each step', async () => {
      const { loggerService } = createMockLoggerService();
      const executionOrder: string[] = [];

      const middleware1: StepMiddleware = {
        name: 'middleware1',
        execute: async (ctx, next) => {
          executionOrder.push(`middleware1:before:${ctx.step.name}`);
          const result = await next();
          executionOrder.push(`middleware1:after:${ctx.step.name}`);
          return result;
        },
      };

      const middleware2: StepMiddleware = {
        name: 'middleware2',
        execute: async (ctx, next) => {
          executionOrder.push(`middleware2:before:${ctx.step.name}`);
          const result = await next();
          executionOrder.push(`middleware2:after:${ctx.step.name}`);
          return result;
        },
      };

      const step1 = createMockStep('step1', async () => {
        executionOrder.push('step1:execute');
        return continueExecution();
      });

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [step1],
        [middleware1, middleware2]
      );
      const input = createExecutionInput();

      await pipeline.execute(input);

      // Middleware1 is outermost, middleware2 is inner, step is innermost
      expect(executionOrder).toEqual([
        'middleware1:before:step1',
        'middleware2:before:step1',
        'step1:execute',
        'middleware2:after:step1',
        'middleware1:after:step1',
      ]);
    });

    it('middleware can intercept errors', async () => {
      const { loggerService } = createMockLoggerService();
      const errorHandlerCalled = jest.fn();

      const errorMiddleware: StepMiddleware = {
        name: 'error_handler',
        execute: async (ctx, next) => {
          try {
            return await next();
          } catch (error) {
            errorHandlerCalled(error);
            throw error;
          }
        },
      };

      const step1 = createMockStep('step1', async () => {
        throw new Error('Step error');
      });

      const pipeline = new RuleExecutionPipeline(loggerService, [step1], [errorMiddleware]);
      const input = createExecutionInput();

      await expect(pipeline.execute(input)).rejects.toThrow('Step error');
      expect(errorHandlerCalled).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
