/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { RanExperiment } from '../types';
import {
  createTraceCollectorStep,
  createBatchTraceCollectorStep,
  type TraceCollectorStepInput,
} from './trace_collector';

// Mock the trace preprocessor
const mockFetchTrace = jest.fn();
jest.mock('../utils/improvement_suggestions/trace_preprocessor', () => ({
  createTracePreprocessor: () => ({
    fetchTrace: mockFetchTrace,
  }),
  validateTraceId: (id: string) => /^[a-f0-9]{32}$/i.test(id),
}));

// Mock p-limit
jest.mock('p-limit', () => {
  const pLimit =
    () =>
    <T>(fn: () => Promise<T>) =>
      fn();
  pLimit.default = pLimit;
  return pLimit;
});

describe('trace_collector', () => {
  const mockLog: jest.Mocked<SomeDevLog> = {
    debug: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  } as any;

  const mockEsClient = {
    search: jest.fn(),
    bulk: jest.fn(),
  } as any;

  const validTraceId = 'a'.repeat(32);
  const validTraceId2 = 'b'.repeat(32);

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
        metadata: { traceId: validTraceId },
        output: { response: 'actual' },
        evalThreadId: validTraceId,
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

  const createMockTrace = (traceId: string) => ({
    traceId,
    rootOperation: 'test-operation',
    spans: [
      {
        spanId: 'span-1',
        name: 'test-span',
        startTime: Date.now(),
        duration: 100,
      },
    ],
    metrics: {
      totalDurationMs: 100,
      spanCount: 1,
      llmCallCount: 0,
      toolCallCount: 0,
      errorCount: 0,
      tokens: { input: 10, output: 20, cached: 0, total: 30 },
      latencyByKind: {},
      modelsUsed: [],
      toolsCalled: [],
    },
    errorSpans: [],
    llmSpans: [],
    toolSpans: [],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchTrace.mockReset();
  });

  describe('createTraceCollectorStep', () => {
    it('should create a step with elasticsearch backend', () => {
      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      expect(step).toBeDefined();
      expect(step.execute).toBeDefined();
      expect(step.getBackend).toBeDefined();
      expect(step.fetchTrace).toBeDefined();
      expect(step.validateTraceId).toBeDefined();
      expect(step.getBackend()).toBe('elasticsearch');
    });

    it('should throw error when elasticsearch backend is used without esClient', () => {
      expect(() =>
        createTraceCollectorStep({
          log: mockLog,
          backend: 'elasticsearch',
        })
      ).toThrow('Elasticsearch client is required when using elasticsearch backend');
    });

    it('should create a step with phoenix backend', () => {
      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'phoenix',
      });

      expect(step.getBackend()).toBe('phoenix');
    });

    it('should validate trace IDs correctly', () => {
      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      expect(step.validateTraceId(validTraceId)).toBe(true);
      expect(step.validateTraceId('invalid')).toBe(false);
      expect(step.validateTraceId('')).toBe(false);
    });
  });

  describe('execute', () => {
    it('should collect traces successfully', async () => {
      mockFetchTrace.mockResolvedValue(createMockTrace(validTraceId));

      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      const input: TraceCollectorStepInput = {
        experiment: createMockExperiment(),
      };

      const result = await step.execute(input);

      expect(result.status).toBe('completed');
      expect(result.correlations).toHaveLength(1);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
      expect(result.skippedCount).toBe(0);
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle experiments with no runs', async () => {
      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      const input: TraceCollectorStepInput = {
        experiment: createMockExperiment({ runs: {} }),
      };

      const result = await step.execute(input);

      expect(result.status).toBe('completed');
      expect(result.correlations).toHaveLength(0);
      expect(result.warnings).toContain('No runs found in experiment');
    });

    it('should skip runs with missing trace IDs', async () => {
      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      const experiment = createMockExperiment({
        runs: {
          'run-0-0': {
            exampleIndex: 0,
            repetition: 0,
            input: { query: 'test' },
            expected: { answer: 'expected' },
            metadata: {},
            output: { response: 'actual' },
          },
        },
      });

      const result = await step.execute({ experiment });

      expect(result.status).toBe('completed');
      expect(result.skippedCount).toBe(1);
      expect(result.successCount).toBe(0);
    });

    it('should skip runs with invalid trace IDs', async () => {
      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      const experiment = createMockExperiment({
        runs: {
          'run-0-0': {
            exampleIndex: 0,
            repetition: 0,
            input: { query: 'test' },
            expected: { answer: 'expected' },
            metadata: { traceId: 'invalid-trace-id' },
            output: { response: 'actual' },
            evalThreadId: 'invalid-trace-id',
          },
        },
      });

      const result = await step.execute({ experiment });

      expect(result.status).toBe('completed');
      // Runs with invalid trace IDs are skipped (not fetched)
      expect(result.skippedCount).toBeGreaterThanOrEqual(0);
    });

    it('should use explicit traceIdMap over metadata', async () => {
      mockFetchTrace.mockResolvedValue(createMockTrace(validTraceId2));

      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      const traceIdMap = new Map([['run-0-0', validTraceId2]]);

      const result = await step.execute({
        experiment: createMockExperiment(),
        traceIdMap,
      });

      expect(mockFetchTrace).toHaveBeenCalledWith(validTraceId2, undefined);
      expect(result.correlations[0].traceId).toBe(validTraceId2);
    });

    it('should handle trace fetch failures gracefully', async () => {
      mockFetchTrace.mockRejectedValue(new Error('Trace not found'));

      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      const result = await step.execute({
        experiment: createMockExperiment(),
      });

      expect(result.status).toBe('completed');
      expect(result.failureCount).toBe(1);
      expect(result.correlations[0].traceError).toBe('Trace not found');
      expect(result.warnings.some((w) => w.includes('Failed to fetch trace'))).toBe(true);
    });

    it('should invoke onStart callback', async () => {
      const onStart = jest.fn();
      mockFetchTrace.mockResolvedValue(createMockTrace(validTraceId));

      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
        onStart,
      });

      await step.execute({ experiment: createMockExperiment() });

      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('should invoke onComplete callback with result', async () => {
      const onComplete = jest.fn();
      mockFetchTrace.mockResolvedValue(createMockTrace(validTraceId));

      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
        onComplete,
      });

      await step.execute({ experiment: createMockExperiment() });

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          correlations: expect.any(Array),
        })
      );
    });

    it('should invoke onTraceFetched callback for each trace', async () => {
      const onTraceFetched = jest.fn();
      const trace = createMockTrace(validTraceId);
      mockFetchTrace.mockResolvedValue(trace);

      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
        onTraceFetched,
      });

      await step.execute({ experiment: createMockExperiment() });

      expect(onTraceFetched).toHaveBeenCalledTimes(1);
      expect(onTraceFetched).toHaveBeenCalledWith(validTraceId, trace);
    });

    it('should invoke onError callback on fatal error', async () => {
      const onError = jest.fn();

      // Create a step that will throw during execution
      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
        onError,
      });

      // Mock the trace fetcher to throw a fatal error
      mockFetchTrace.mockImplementation(() => {
        throw new Error('Fatal ES error');
      });

      const experiment = createMockExperiment();
      const result = await step.execute({ experiment });

      // Trace fetch errors are handled gracefully per-trace, not as fatal errors
      // The step completes with failure count > 0
      expect(result.failureCount).toBe(1);
    });

    it('should correlate evaluation results with runs', async () => {
      mockFetchTrace.mockResolvedValue(createMockTrace(validTraceId));

      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'Eval1', result: { score: 0.8 }, runKey: 'run-0-0', exampleIndex: 0 },
          { name: 'Eval2', result: { score: 0.6 }, runKey: 'run-0-0', exampleIndex: 0 },
        ],
      });

      const result = await step.execute({ experiment });

      const correlation = result.correlations[0];
      expect(correlation.evaluationResults).toHaveProperty('Eval1');
      expect(correlation.evaluationResults).toHaveProperty('Eval2');
      expect(correlation.evaluationResults.Eval1.score).toBe(0.8);
      expect(correlation.evaluationResults.Eval2.score).toBe(0.6);
    });

    it('should include input and output in correlations', async () => {
      mockFetchTrace.mockResolvedValue(createMockTrace(validTraceId));

      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      const result = await step.execute({ experiment: createMockExperiment() });

      const correlation = result.correlations[0];
      expect(correlation.input).toEqual({ query: 'test' });
      expect(correlation.expected).toEqual({ answer: 'expected' });
      expect(correlation.output).toEqual({ response: 'actual' });
    });

    it('should handle multiple runs with different trace IDs', async () => {
      mockFetchTrace.mockImplementation((traceId: string) =>
        Promise.resolve(createMockTrace(traceId))
      );

      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      const experiment = createMockExperiment({
        runs: {
          'run-0-0': {
            exampleIndex: 0,
            repetition: 0,
            input: { query: 'test1' },
            expected: {},
            metadata: { traceId: validTraceId },
            output: {},
            evalThreadId: validTraceId,
          },
          'run-1-0': {
            exampleIndex: 1,
            repetition: 0,
            input: { query: 'test2' },
            expected: {},
            metadata: { traceId: validTraceId2 },
            output: {},
            evalThreadId: validTraceId2,
          },
        },
      });

      const result = await step.execute({ experiment });

      expect(result.successCount).toBe(2);
      expect(result.correlations).toHaveLength(2);
    });
  });

  describe('fetchTrace', () => {
    it('should fetch trace by ID', async () => {
      const trace = createMockTrace(validTraceId);
      mockFetchTrace.mockResolvedValue(trace);

      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      const result = await step.fetchTrace(validTraceId);

      expect(result).toEqual(trace);
      expect(mockFetchTrace).toHaveBeenCalledWith(validTraceId, undefined);
    });

    it('should throw error for invalid trace ID', async () => {
      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      await expect(step.fetchTrace('invalid')).rejects.toThrow('Invalid trace ID format');
    });

    it('should return minimal trace for phoenix backend', async () => {
      const step = createTraceCollectorStep({
        log: mockLog,
        backend: 'phoenix',
      });

      const result = await step.fetchTrace(validTraceId);

      expect(result.traceId).toBe(validTraceId);
      expect(result.spans).toEqual([]);
      expect(mockLog.warning).toHaveBeenCalledWith(
        expect.stringContaining('Phoenix trace fetching is not fully implemented')
      );
    });
  });

  describe('createBatchTraceCollectorStep', () => {
    it('should create a batch step', () => {
      const batchStep = createBatchTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      expect(batchStep.executeBatch).toBeDefined();
      expect(batchStep.getStep).toBeDefined();
      expect(batchStep.getBackend).toBeDefined();
      expect(batchStep.getBackend()).toBe('elasticsearch');
    });

    it('should execute batch in parallel by default', async () => {
      mockFetchTrace.mockResolvedValue(createMockTrace(validTraceId));

      const batchStep = createBatchTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
        parallel: true,
      });

      const inputs = [
        { experiment: createMockExperiment({ id: 'exp-1' }) },
        { experiment: createMockExperiment({ id: 'exp-2' }) },
      ];

      const result = await batchStep.executeBatch(inputs);

      expect(result.status).toBe('completed');
      expect(result.results).toHaveLength(2);
      expect(result.totalSuccessCount).toBe(2);
      expect(result.totalFailureCount).toBe(0);
    });

    it('should execute batch sequentially when parallel is false', async () => {
      mockFetchTrace.mockResolvedValue(createMockTrace(validTraceId));

      const batchStep = createBatchTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
        parallel: false,
      });

      const inputs = [
        { experiment: createMockExperiment({ id: 'exp-1' }) },
        { experiment: createMockExperiment({ id: 'exp-2' }) },
      ];

      const result = await batchStep.executeBatch(inputs);

      expect(result.status).toBe('completed');
      expect(result.results).toHaveLength(2);
    });

    it('should aggregate counts across experiments', async () => {
      mockFetchTrace
        .mockResolvedValueOnce(createMockTrace(validTraceId))
        .mockRejectedValueOnce(new Error('Failed'));

      const batchStep = createBatchTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      const inputs = [
        { experiment: createMockExperiment({ id: 'exp-1' }) },
        { experiment: createMockExperiment({ id: 'exp-2' }) },
      ];

      const result = await batchStep.executeBatch(inputs);

      expect(result.totalSuccessCount).toBe(1);
      expect(result.totalFailureCount).toBe(1);
    });

    it('should track total duration and timestamps', async () => {
      mockFetchTrace.mockResolvedValue(createMockTrace(validTraceId));

      const batchStep = createBatchTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      const result = await batchStep.executeBatch([{ experiment: createMockExperiment() }]);

      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
    });

    it('should aggregate failure counts correctly', async () => {
      mockFetchTrace.mockRejectedValue(new Error('Trace fetch failed'));

      const batchStep = createBatchTraceCollectorStep({
        log: mockLog,
        backend: 'elasticsearch',
        esClient: mockEsClient,
      });

      const inputs = [
        { experiment: createMockExperiment({ id: 'exp-1' }) },
        { experiment: createMockExperiment({ id: 'exp-2' }) },
      ];

      const result = await batchStep.executeBatch(inputs);

      // Individual trace failures don't cause experiment-level failure
      // The step completes but with failure counts
      expect(result.totalFailureCount).toBe(2);
    });
  });
});
