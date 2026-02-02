/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelFamily, ModelProvider, type Model } from '@kbn/inference-common';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { EvalsExecutorClient, RanExperiment } from '../types';
import {
  createEvalRunnerStep,
  createBatchEvalRunnerStep,
  type EvalRunnerStepInput,
} from './eval_runner';

// Mock p-limit
jest.mock('p-limit', () => {
  const pLimit =
    () =>
    <T>(fn: () => Promise<T>) =>
      fn();
  pLimit.default = pLimit;
  return pLimit;
});

describe('eval_runner', () => {
  const mockLog: jest.Mocked<SomeDevLog> = {
    debug: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  } as any;

  const model: Model = {
    id: 'gpt-4',
    family: ModelFamily.GPT,
    provider: ModelProvider.OpenAI,
  };

  const createMockExperiment = (overrides: Partial<RanExperiment> = {}): RanExperiment => ({
    id: 'exp-123',
    datasetId: 'ds-123',
    datasetName: 'test-dataset',
    runs: {
      'run-0-0': {
        exampleIndex: 0,
        repetition: 0,
        input: { query: 'test' },
        expected: { answer: 'expected' },
        metadata: {},
        output: { response: 'actual' },
        evalThreadId: 'thread-1',
      },
    },
    evaluationRuns: [
      {
        name: 'TestEvaluator',
        result: { score: 0.8 },
        runKey: 'run-0-0',
        exampleIndex: 0,
        repetition: 0,
      },
    ],
    ...overrides,
  });

  const createMockExecutorClient = (
    experiment: RanExperiment = createMockExperiment()
  ): jest.Mocked<EvalsExecutorClient> => ({
    runExperiment: jest.fn().mockResolvedValue(experiment),
    getRanExperiments: jest.fn().mockResolvedValue([experiment]),
  });

  const createTestInput = (): EvalRunnerStepInput => ({
    dataset: {
      name: 'test-dataset',
      description: 'A test dataset',
      examples: [{ input: { query: 'test' }, output: { answer: 'expected' } }],
    },
    task: jest.fn().mockResolvedValue({ response: 'actual' }),
    evaluators: [
      {
        name: 'TestEvaluator',
        kind: 'CODE',
        evaluate: jest.fn().mockResolvedValue({ score: 0.8 }),
      },
    ],
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvalRunnerStep', () => {
    it('should create a step with default configuration', () => {
      const mockExecutor = createMockExecutorClient();
      const step = createEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
      });

      expect(step).toBeDefined();
      expect(step.execute).toBeDefined();
      expect(step.getExecutorClient).toBeDefined();
      expect(step.getRanExperiments).toBeDefined();
    });

    it('should return the executor client', () => {
      const mockExecutor = createMockExecutorClient();
      const step = createEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
      });

      expect(step.getExecutorClient()).toBe(mockExecutor);
    });

    it('should return ran experiments from executor client', async () => {
      const experiment = createMockExperiment();
      const mockExecutor = createMockExecutorClient(experiment);
      const step = createEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
      });

      const experiments = await step.getRanExperiments();

      expect(mockExecutor.getRanExperiments).toHaveBeenCalled();
      expect(experiments).toHaveLength(1);
      expect(experiments[0].id).toBe('exp-123');
    });
  });

  describe('execute', () => {
    it('should execute successfully and return result with experiment', async () => {
      const experiment = createMockExperiment();
      const mockExecutor = createMockExecutorClient(experiment);
      const step = createEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
      });

      const input = createTestInput();
      const result = await step.execute(input);

      expect(result.status).toBe('completed');
      expect(result.experiment).toBeDefined();
      expect(result.experiment?.id).toBe('exp-123');
      expect(result.meanScore).toBe(0.8);
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should calculate mean score from multiple evaluation runs', async () => {
      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'Eval1', result: { score: 1.0 }, exampleIndex: 0 },
          { name: 'Eval2', result: { score: 0.6 }, exampleIndex: 0 },
          { name: 'Eval1', result: { score: 0.8 }, exampleIndex: 1 },
          { name: 'Eval2', result: { score: 0.4 }, exampleIndex: 1 },
        ],
      });
      const mockExecutor = createMockExecutorClient(experiment);
      const step = createEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
      });

      const result = await step.execute(createTestInput());

      expect(result.meanScore).toBeCloseTo(0.7, 5); // (1.0 + 0.6 + 0.8 + 0.4) / 4
    });

    it('should return 0 mean score when no evaluation runs', async () => {
      const experiment = createMockExperiment({ evaluationRuns: [] });
      const mockExecutor = createMockExecutorClient(experiment);
      const step = createEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
      });

      const result = await step.execute(createTestInput());

      expect(result.meanScore).toBe(0);
    });

    it('should handle null scores in evaluation runs', async () => {
      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'Eval1', result: { score: 1.0 }, exampleIndex: 0 },
          { name: 'Eval2', result: { score: null }, exampleIndex: 0 },
          { name: 'Eval3', result: {}, exampleIndex: 0 },
        ],
      });
      const mockExecutor = createMockExecutorClient(experiment);
      const step = createEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
      });

      const result = await step.execute(createTestInput());

      expect(result.meanScore).toBe(1.0); // Only valid score
    });

    it('should invoke onStart callback', async () => {
      const onStart = jest.fn();
      const mockExecutor = createMockExecutorClient();
      const step = createEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
        onStart,
      });

      await step.execute(createTestInput());

      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('should invoke onComplete callback with result', async () => {
      const onComplete = jest.fn();
      const mockExecutor = createMockExecutorClient();
      const step = createEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
        onComplete,
      });

      await step.execute(createTestInput());

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          experiment: expect.any(Object),
        })
      );
    });

    it('should invoke onExperimentComplete callback', async () => {
      const onExperimentComplete = jest.fn();
      const experiment = createMockExperiment();
      const mockExecutor = createMockExecutorClient(experiment);
      const step = createEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
        onExperimentComplete,
      });

      await step.execute(createTestInput());

      expect(onExperimentComplete).toHaveBeenCalledTimes(1);
      expect(onExperimentComplete).toHaveBeenCalledWith(experiment);
    });

    it('should handle errors and return failed status', async () => {
      const mockExecutor = createMockExecutorClient();
      mockExecutor.runExperiment.mockRejectedValue(new Error('Experiment failed'));

      const step = createEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
      });

      const result = await step.execute(createTestInput());

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Experiment failed');
      expect(result.experiment).toBeUndefined();
    });

    it('should invoke onError callback on failure', async () => {
      const onError = jest.fn();
      const mockExecutor = createMockExecutorClient();
      mockExecutor.runExperiment.mockRejectedValue(new Error('Experiment failed'));

      const step = createEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
        onError,
      });

      await step.execute(createTestInput());

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should invoke onComplete callback even on failure', async () => {
      const onComplete = jest.fn();
      const mockExecutor = createMockExecutorClient();
      mockExecutor.runExperiment.mockRejectedValue(new Error('Experiment failed'));

      const step = createEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
        onComplete,
      });

      await step.execute(createTestInput());

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: expect.any(Error),
        })
      );
    });

    it('should pass metadata to executor client', async () => {
      const mockExecutor = createMockExecutorClient();
      const step = createEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
      });

      const input = createTestInput();
      input.metadata = { customField: 'value' };

      await step.execute(input);

      expect(mockExecutor.runExperiment).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            customField: 'value',
            runId: 'run-1',
            model,
          }),
        }),
        expect.any(Array)
      );
    });

    it('should convert non-Error exceptions to Error objects', async () => {
      const mockExecutor = createMockExecutorClient();
      mockExecutor.runExperiment.mockRejectedValue('String error');

      const step = createEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
      });

      const result = await step.execute(createTestInput());

      expect(result.status).toBe('failed');
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('String error');
    });
  });

  describe('createBatchEvalRunnerStep', () => {
    it('should create a batch step', () => {
      const mockExecutor = createMockExecutorClient();
      const batchStep = createBatchEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
      });

      expect(batchStep.executeBatch).toBeDefined();
      expect(batchStep.getStep).toBeDefined();
      expect(batchStep.getExecutorClient).toBeDefined();
      expect(batchStep.getRanExperiments).toBeDefined();
    });

    it('should execute multiple inputs sequentially by default', async () => {
      const experiments = [
        createMockExperiment({ id: 'exp-1' }),
        createMockExperiment({ id: 'exp-2' }),
      ];
      const mockExecutor = createMockExecutorClient();
      mockExecutor.runExperiment
        .mockResolvedValueOnce(experiments[0])
        .mockResolvedValueOnce(experiments[1]);

      const batchStep = createBatchEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
        parallel: false,
      });

      const inputs = [
        createTestInput(),
        {
          ...createTestInput(),
          dataset: { name: 'dataset-2', description: 'Second dataset', examples: [] },
        },
      ];

      const result = await batchStep.executeBatch(inputs);

      expect(result.status).toBe('completed');
      expect(result.results).toHaveLength(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it('should execute multiple inputs in parallel when configured', async () => {
      const experiments = [
        createMockExperiment({ id: 'exp-1' }),
        createMockExperiment({ id: 'exp-2' }),
      ];
      const mockExecutor = createMockExecutorClient();
      mockExecutor.runExperiment
        .mockResolvedValueOnce(experiments[0])
        .mockResolvedValueOnce(experiments[1]);

      const batchStep = createBatchEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
        parallel: true,
        maxParallel: 3,
      });

      const inputs = [createTestInput(), createTestInput()];

      const result = await batchStep.executeBatch(inputs);

      expect(result.status).toBe('completed');
      expect(result.results).toHaveLength(2);
    });

    it('should calculate aggregate mean score from successful experiments', async () => {
      const experiments = [
        createMockExperiment({
          id: 'exp-1',
          evaluationRuns: [{ name: 'Eval', result: { score: 1.0 }, exampleIndex: 0 }],
        }),
        createMockExperiment({
          id: 'exp-2',
          evaluationRuns: [{ name: 'Eval', result: { score: 0.6 }, exampleIndex: 0 }],
        }),
      ];
      const mockExecutor = createMockExecutorClient();
      mockExecutor.runExperiment
        .mockResolvedValueOnce(experiments[0])
        .mockResolvedValueOnce(experiments[1]);

      const batchStep = createBatchEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
      });

      const result = await batchStep.executeBatch([createTestInput(), createTestInput()]);

      expect(result.aggregateMeanScore).toBe(0.8); // (1.0 + 0.6) / 2
    });

    it('should handle partial failures', async () => {
      const experiment = createMockExperiment();
      const mockExecutor = createMockExecutorClient();
      mockExecutor.runExperiment
        .mockResolvedValueOnce(experiment)
        .mockRejectedValueOnce(new Error('Failed'));

      const batchStep = createBatchEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
      });

      const result = await batchStep.executeBatch([createTestInput(), createTestInput()]);

      expect(result.status).toBe('completed'); // At least one succeeded
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
    });

    it('should return failed status when all experiments fail', async () => {
      const mockExecutor = createMockExecutorClient();
      mockExecutor.runExperiment.mockRejectedValue(new Error('Failed'));

      const batchStep = createBatchEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
      });

      const result = await batchStep.executeBatch([createTestInput(), createTestInput()]);

      expect(result.status).toBe('failed');
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(2);
    });

    it('should track total duration', async () => {
      const mockExecutor = createMockExecutorClient();
      const batchStep = createBatchEvalRunnerStep({
        log: mockLog,
        model,
        runId: 'run-1',
        executorClient: mockExecutor,
      });

      const result = await batchStep.executeBatch([createTestInput()]);

      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
    });
  });
});
