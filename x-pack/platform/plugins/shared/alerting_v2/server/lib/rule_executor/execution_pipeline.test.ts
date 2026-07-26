/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionPipeline } from './execution_pipeline';
import type { RulePipelineState, RuleExecutionStep } from './types';
import type { RuleExecutionMiddleware } from './middleware';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { pipeStream } from './stream_utils';
import {
  createRuleExecutionPipelineInput,
  createMockStep,
  createQueryPayload,
  createRuleResponse,
} from './test_utils';
import { createMetricCollectorFactory } from './metrics/metric_collector_factory.mock';
import { createMockRuleExecutorEventPublisher } from '../events/rule_executor_event_publisher/rule_executor_event_publisher.mock';
import { MetricsMiddleware } from './metrics/metrics_middleware';
import { EmittedCountersRecorder } from './metrics/recorders/emitted_counters_recorder';
import { RULE_EXECUTION_COUNTERS } from './metrics/counters';

describe('RuleExecutionPipeline', () => {
  describe('execute', () => {
    it('executes all steps in order when all continue', async () => {
      const { loggerService } = createLoggerService();
      const executionOrder: string[] = [];

      const step1 = createMockStep('step1', (input) =>
        pipeStream(input, (state) => {
          executionOrder.push('step1');
          return { type: 'continue', state };
        })
      );

      const step2 = createMockStep('step2', (input) =>
        pipeStream(input, (state) => {
          executionOrder.push('step2');
          return { type: 'continue', state };
        })
      );

      const step3 = createMockStep('step3', (input) =>
        pipeStream(input, (state) => {
          executionOrder.push('step3');
          return { type: 'continue', state };
        })
      );

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [step1, step2, step3],
        [],
        createMetricCollectorFactory(),
        createMockRuleExecutorEventPublisher()
      );
      const input = createRuleExecutionPipelineInput();

      const result = await pipeline.execute(input);

      expect(result.completed).toBe(true);
      expect(result.haltReason).toBeUndefined();
      expect(executionOrder).toEqual(['step1', 'step2', 'step3']);
    });

    it('stops execution when a step returns halt', async () => {
      const { loggerService } = createLoggerService();
      const executionOrder: string[] = [];

      const step1 = createMockStep('step1', (input) =>
        pipeStream(input, (state) => {
          executionOrder.push('step1');
          return { type: 'continue', state };
        })
      );

      const step2 = createMockStep('step2', (input) =>
        pipeStream(input, (state) => {
          executionOrder.push('step2');
          return { type: 'halt', reason: 'rule_deleted', state };
        })
      );

      const step3 = createMockStep('step3', (input) =>
        pipeStream(input, (state) => {
          executionOrder.push('step3');
          return { type: 'continue', state };
        })
      );

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [step1, step2, step3],
        [],
        createMetricCollectorFactory(),
        createMockRuleExecutorEventPublisher()
      );
      const input = createRuleExecutionPipelineInput();

      const result = await pipeline.execute(input);

      expect(result.completed).toBe(false);
      expect(result.haltReason).toBe('rule_deleted');
      expect(executionOrder).toEqual(['step1', 'step2']);
    });

    it('accumulates state across steps correctly', async () => {
      const { loggerService } = createLoggerService();
      const statesReceived: RulePipelineState[] = [];

      const step1 = createMockStep('step1', (input) =>
        pipeStream(input, (state) => {
          statesReceived.push({ ...state });
          return { type: 'continue', state: { ...state, rule: createRuleResponse() } };
        })
      );

      const step2 = createMockStep('step2', (input) =>
        pipeStream(input, (state) => {
          statesReceived.push({ ...state });
          return { type: 'continue', state: { ...state, queryPayload: createQueryPayload() } };
        })
      );

      const step3 = createMockStep('step3', (input) =>
        pipeStream(input, (state) => {
          statesReceived.push({ ...state });
          return { type: 'continue', state };
        })
      );

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [step1, step2, step3],
        [],
        createMetricCollectorFactory(),
        createMockRuleExecutorEventPublisher()
      );
      const input = createRuleExecutionPipelineInput();

      const result = await pipeline.execute(input);

      expect(statesReceived[0].input.ruleId).toBe(input.ruleId);
      expect(statesReceived[0].input.executionContext).toBeDefined();
      expect(statesReceived[0].rule).toBeUndefined();

      expect(statesReceived[1].input.ruleId).toBe(input.ruleId);
      expect(statesReceived[1].rule).toBeDefined();
      expect(statesReceived[1].queryPayload).toBeUndefined();

      expect(statesReceived[2].input.ruleId).toBe(input.ruleId);
      expect(statesReceived[2].rule).toBeDefined();
      expect(statesReceived[2].queryPayload).toBeDefined();

      expect(result.finalState.rule).toBeDefined();
      expect(result.finalState.queryPayload).toBeDefined();
    });

    it('propagates errors from steps', async () => {
      const { loggerService } = createLoggerService();
      const error = new Error('Step failed');

      const step1 = createMockStep('step1', (input) =>
        pipeStream(input, () => {
          throw error;
        })
      );

      const step2 = createMockStep('step2', (input) =>
        pipeStream(input, (state) => ({ type: 'continue', state }))
      );

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [step1, step2],
        [],
        createMetricCollectorFactory(),
        createMockRuleExecutorEventPublisher()
      );
      const input = createRuleExecutionPipelineInput();

      await expect(pipeline.execute(input)).rejects.toThrow('Step failed');
    });

    it('returns empty completed result when no steps', async () => {
      const { loggerService } = createLoggerService();
      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [],
        [],
        createMetricCollectorFactory(),
        createMockRuleExecutorEventPublisher()
      );
      const input = createRuleExecutionPipelineInput();

      const result = await pipeline.execute(input);

      expect(result.completed).toBe(true);
      expect(result.finalState.input.ruleId).toBe(input.ruleId);
      expect(result.finalState.input.executionContext).toBeDefined();
    });

    it('executes middleware chain around each step', async () => {
      const { loggerService } = createLoggerService();
      const executionOrder: string[] = [];

      const middleware1: RuleExecutionMiddleware = {
        name: 'middleware1',
        execute: (ctx, next, stream) => {
          executionOrder.push(`middleware1:before:${ctx.step.name}`);
          const output = next(stream);
          return (async function* () {
            for await (const result of output) {
              executionOrder.push(`middleware1:after:${ctx.step.name}`);
              yield result;
            }
          })();
        },
      };

      const middleware2: RuleExecutionMiddleware = {
        name: 'middleware2',
        execute: (ctx, next, stream) => {
          executionOrder.push(`middleware2:before:${ctx.step.name}`);
          const output = next(stream);
          return (async function* () {
            for await (const result of output) {
              executionOrder.push(`middleware2:after:${ctx.step.name}`);
              yield result;
            }
          })();
        },
      };

      const step1 = createMockStep('step1', (input) =>
        pipeStream(input, (state) => {
          executionOrder.push('step1:execute');
          return { type: 'continue', state };
        })
      );

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [step1],
        [middleware1, middleware2],
        createMetricCollectorFactory(),
        createMockRuleExecutorEventPublisher()
      );
      const input = createRuleExecutionPipelineInput();

      await pipeline.execute(input);

      expect(executionOrder).toEqual([
        'middleware1:before:step1',
        'middleware2:before:step1',
        'step1:execute',
        'middleware2:after:step1',
        'middleware1:after:step1',
      ]);
    });

    it('creates ExecutionContext and attaches it to pipeline state', async () => {
      const { loggerService } = createLoggerService();

      const step = createMockStep('step1', (input) =>
        pipeStream(input, (state) => {
          expect(state.input.executionContext).toBeDefined();
          expect(typeof state.input.executionContext.throwIfAborted).toBe('function');
          expect(typeof state.input.executionContext.createScope).toBe('function');
          expect(typeof state.input.executionContext.onAbort).toBe('function');
          expect(state.input.executionContext.signal).toBeDefined();
          return { type: 'continue', state };
        })
      );

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [step],
        [],
        createMetricCollectorFactory(),
        createMockRuleExecutorEventPublisher()
      );
      const input = createRuleExecutionPipelineInput();

      const result = await pipeline.execute(input);

      expect(result.completed).toBe(true);
      expect(result.finalState.input.executionContext).toBeDefined();
    });

    it('uses the abort signal from pipeline input for the execution context', async () => {
      const { loggerService } = createLoggerService();
      const abortController = new AbortController();

      const step = createMockStep('step1', (input) =>
        pipeStream(input, (state) => {
          expect(state.input.executionContext.signal).toBe(abortController.signal);
          return { type: 'continue', state };
        })
      );

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [step],
        [],
        createMetricCollectorFactory(),
        createMockRuleExecutorEventPublisher()
      );
      const input = createRuleExecutionPipelineInput({ abortSignal: abortController.signal });

      await pipeline.execute(input);
    });

    it('middleware can intercept errors', async () => {
      const { loggerService } = createLoggerService();
      const errorHandlerCalled = jest.fn();

      const errorMiddleware: RuleExecutionMiddleware = {
        name: 'error_handler',
        execute: (_ctx, next, stream) => {
          const output = next(stream);
          return (async function* () {
            try {
              yield* output;
            } catch (error) {
              errorHandlerCalled(error);
              throw error;
            }
          })();
        },
      };

      const step1 = createMockStep('step1', (input) =>
        pipeStream(input, () => {
          throw new Error('Step error');
        })
      );

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [step1],
        [errorMiddleware],
        createMetricCollectorFactory(),
        createMockRuleExecutorEventPublisher()
      );
      const input = createRuleExecutionPipelineInput();

      await expect(pipeline.execute(input)).rejects.toThrow('Step error');
      expect(errorHandlerCalled).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('metrics', () => {
    const executionId = 'execution-uuid';
    const startedAt = new Date('2025-01-01T00:00:00.000Z');

    const createEmittingStep = (
      name: string,
      contribution: Record<string, number>
    ): RuleExecutionStep =>
      createMockStep(name, (input) =>
        pipeStream(input, (state) => ({
          type: 'continue',
          state,
          meta: { counters: contribution },
        }))
      );

    const createRuleStep = (rule: ReturnType<typeof createRuleResponse>): RuleExecutionStep =>
      createMockStep('fetch_rule', (input) =>
        pipeStream(input, (state) => ({ type: 'continue', state: { ...state, rule } }))
      );

    const createMetricsMiddleware = (
      loggerService: ReturnType<typeof createLoggerService>['loggerService']
    ) => new MetricsMiddleware([new EmittedCountersRecorder()], loggerService);

    it('returns a metrics snapshot on the pipeline result', async () => {
      const { loggerService } = createLoggerService();

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [],
        [],
        createMetricCollectorFactory({ startedAt }),
        createMockRuleExecutorEventPublisher()
      );

      const result = await pipeline.execute(createRuleExecutionPipelineInput());

      expect(result.metrics).toEqual({
        executionId,
        startedAt: startedAt.toISOString(),
        endedAt: expect.any(String),
        durationMs: expect.any(Number),
        counters: {},
      });
    });

    it('sums step-emitted counters across multiple emissions into the snapshot', async () => {
      const { loggerService } = createLoggerService();

      const step1 = createEmittingStep('step1', {
        [RULE_EXECUTION_COUNTERS.signalsGenerated]: 3,
      });
      const step2 = createEmittingStep('step2', {
        [RULE_EXECUTION_COUNTERS.signalsGenerated]: 5,
        [RULE_EXECUTION_COUNTERS.ruleEventsGenerated]: 8,
      });

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [step1, step2],
        [createMetricsMiddleware(loggerService)],
        createMetricCollectorFactory({ startedAt }),
        createMockRuleExecutorEventPublisher()
      );

      const result = await pipeline.execute(createRuleExecutionPipelineInput());

      expect(result.metrics.counters).toEqual({
        [RULE_EXECUTION_COUNTERS.signalsGenerated]: 8,
        [RULE_EXECUTION_COUNTERS.ruleEventsGenerated]: 8,
      });
    });

    it('publishes rule.execution.succeeded with rule identity, kind, tags and ruleEventsGenerated after a successful run', async () => {
      const { loggerService } = createLoggerService();
      const eventPublisher = createMockRuleExecutorEventPublisher();

      const ruleStep = createRuleStep(
        createRuleResponse({
          kind: 'signal',
          metadata: { name: 'test-rule', tags: ['security', 'siem'] },
        })
      );
      const storeStep = createEmittingStep('store', {
        [RULE_EXECUTION_COUNTERS.ruleEventsGenerated]: 7,
      });

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [ruleStep, storeStep],
        [createMetricsMiddleware(loggerService)],
        createMetricCollectorFactory({ startedAt }),
        eventPublisher
      );

      const input = createRuleExecutionPipelineInput({
        ruleId: 'rule-42',
        spaceId: 'space-1',
        executionUuid: executionId,
      });
      await pipeline.execute(input);

      expect(eventPublisher.publishExecutionSucceeded).toHaveBeenCalledTimes(1);
      expect(eventPublisher.publishExecutionSucceeded).toHaveBeenCalledWith({
        executionId,
        scheduledAt: input.scheduledAt,
        ruleEventsGenerated: 7,
        rule: {
          ruleId: 'rule-42',
          spaceId: 'space-1',
          kind: 'signal',
          tags: ['security', 'siem'],
        },
      });
    });

    it('defaults tags to [] and ruleEventsGenerated to 0 when absent', async () => {
      const { loggerService } = createLoggerService();
      const eventPublisher = createMockRuleExecutorEventPublisher();

      const ruleStep = createRuleStep(createRuleResponse({ kind: 'alert' }));

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [ruleStep],
        [createMetricsMiddleware(loggerService)],
        createMetricCollectorFactory({ startedAt }),
        eventPublisher
      );

      await pipeline.execute(createRuleExecutionPipelineInput());

      expect(eventPublisher.publishExecutionSucceeded).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleEventsGenerated: 0,
          rule: expect.objectContaining({ kind: 'alert', tags: [] }),
        })
      );
    });

    it('does not publish rule.execution.succeeded when the final state has no rule', async () => {
      const { loggerService } = createLoggerService();
      const eventPublisher = createMockRuleExecutorEventPublisher();

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [],
        [createMetricsMiddleware(loggerService)],
        createMetricCollectorFactory({ startedAt }),
        eventPublisher
      );

      await pipeline.execute(createRuleExecutionPipelineInput());

      expect(eventPublisher.publishExecutionSucceeded).not.toHaveBeenCalled();
    });

    it('publishes rule.execution.failed (not succeeded) with rule (id, spaceId) and error message when a step throws', async () => {
      const { loggerService } = createLoggerService();
      const eventPublisher = createMockRuleExecutorEventPublisher();

      const step = createMockStep('boom', (input) =>
        pipeStream(input, () => {
          throw new Error('Step blew up');
        })
      );

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [step],
        [createMetricsMiddleware(loggerService)],
        createMetricCollectorFactory({ startedAt }),
        eventPublisher
      );

      await expect(
        pipeline.execute(createRuleExecutionPipelineInput({ ruleId: 'rule-42' }))
      ).rejects.toThrow('Step blew up');

      expect(eventPublisher.publishExecutionSucceeded).not.toHaveBeenCalled();
      expect(eventPublisher.publishExecutionFailed).toHaveBeenCalledTimes(1);
      expect(eventPublisher.publishExecutionFailed).toHaveBeenCalledWith({
        rule: { id: 'rule-42', spaceId: 'default' },
        error: 'Step blew up',
      });
    });

    it('does not publish rule.execution.failed on a successful run', async () => {
      const { loggerService } = createLoggerService();
      const eventPublisher = createMockRuleExecutorEventPublisher();

      const ruleStep = createRuleStep(createRuleResponse({ kind: 'alert' }));

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [ruleStep],
        [createMetricsMiddleware(loggerService)],
        createMetricCollectorFactory({ startedAt }),
        eventPublisher
      );

      await pipeline.execute(createRuleExecutionPipelineInput());

      expect(eventPublisher.publishExecutionFailed).not.toHaveBeenCalled();
    });

    it('does not publish rule.execution.succeeded when the run halts', async () => {
      const { loggerService } = createLoggerService();
      const eventPublisher = createMockRuleExecutorEventPublisher();

      const ruleStep = createRuleStep(createRuleResponse({ kind: 'signal' }));
      const step2 = createMockStep('halt', (input) =>
        pipeStream(input, (state) => ({ type: 'halt', reason: 'rule_disabled', state }))
      );

      const pipeline = new RuleExecutionPipeline(
        loggerService,
        [ruleStep, step2],
        [createMetricsMiddleware(loggerService)],
        createMetricCollectorFactory({ startedAt }),
        eventPublisher
      );

      const result = await pipeline.execute(createRuleExecutionPipelineInput());

      expect(result.completed).toBe(false);
      expect(eventPublisher.publishExecutionSucceeded).not.toHaveBeenCalled();
      expect(eventPublisher.publishExecutionFailed).not.toHaveBeenCalled();
    });
  });
});
