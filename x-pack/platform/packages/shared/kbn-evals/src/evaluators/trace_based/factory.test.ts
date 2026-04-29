/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTraceBasedEvaluator, type TraceBasedEvaluatorConfig } from './factory';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

const VALID_TRACE_ID = '0af7651916cd43dd8448eb211c80319c';

const evaluateWith = (evaluator: ReturnType<typeof createTraceBasedEvaluator>, traceId: string) =>
  evaluator.evaluate({ input: {}, output: { traceId }, expected: {}, metadata: {} });

describe('createTraceBasedEvaluator', () => {
  let mockEsClient: jest.Mocked<EsClient>;
  let mockLog: jest.Mocked<ToolingLog>;
  let mockConfig: TraceBasedEvaluatorConfig;

  beforeEach(() => {
    jest.useFakeTimers();
    const mockQuery = jest.fn();
    mockEsClient = {
      esql: {
        query: mockQuery,
      },
    } as any;

    mockLog = {
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockConfig = {
      name: 'Test Evaluator',
      buildQuery: (traceId: string) => `FROM traces-* | WHERE trace.id == "${traceId}"`,
      extractResult: (response) => response.values[0][0] as number | null,
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should construct valid ES|QL query with sanitized trace ID', async () => {
    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: mockConfig,
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [{ name: 'result', type: 'number' }],
      values: [[42]],
    } as any);

    await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(mockEsClient.esql.query as jest.Mock).toHaveBeenCalledWith({
      query: `FROM traces-* | WHERE trace.id == "${VALID_TRACE_ID}"`,
    });
  });

  it('should parse ES|QL response and return score', async () => {
    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: mockConfig,
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [{ name: 'result', type: 'number' }],
      values: [[100]],
    } as any);

    const result = await evaluateWith(evaluator, '1234567890abcdef1234567890abcdef');

    expect(result.score).toBe(100);
  });

  it('should return error for invalid trace ID', async () => {
    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: mockConfig,
    });

    const result = await evaluateWith(evaluator, 'invalid-trace-id');

    expect(result.label).toBe('error');
    expect(result.explanation).toBe('Invalid traceId');
  });

  it('should retry when extractResult returns null (default validation)', async () => {
    const query = mockEsClient.esql.query as jest.Mock;
    query
      .mockResolvedValueOnce({ columns: [{ name: 'r', type: 'number' }], values: [[null]] })
      .mockResolvedValueOnce({ columns: [{ name: 'r', type: 'number' }], values: [[42]] });

    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: mockConfig,
    });

    const promise = evaluateWith(evaluator, VALID_TRACE_ID);
    await jest.advanceTimersByTimeAsync(60_000);
    const result = await promise;

    expect(result.score).toBe(42);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('should retry when custom isResultValid returns false', async () => {
    const query = mockEsClient.esql.query as jest.Mock;
    query
      .mockResolvedValueOnce({ columns: [{ name: 'r', type: 'number' }], values: [[0]] })
      .mockResolvedValueOnce({ columns: [{ name: 'r', type: 'number' }], values: [[150]] });

    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: {
        ...mockConfig,
        isResultValid: (result) => result !== null && result > 0,
      },
    });

    const promise = evaluateWith(evaluator, VALID_TRACE_ID);
    await jest.advanceTimersByTimeAsync(60_000);
    const result = await promise;

    expect(result.score).toBe(150);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('should return potentially_incomplete when retries exhaust with an incomplete result', async () => {
    const query = mockEsClient.esql.query as jest.Mock;
    query.mockResolvedValue({
      columns: [{ name: 'r', type: 'number' }],
      values: [[null]],
    });

    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: mockConfig,
    });

    const promise = evaluateWith(evaluator, VALID_TRACE_ID);
    await jest.advanceTimersByTimeAsync(300_000);
    const result = await promise;

    expect(result.score).toBeNull();
    expect(result.label).toBe('potentially_incomplete');
    expect(result.metadata).toEqual({ incomplete: true });
  });

  it('should return error when retries exhaust with no data at all', async () => {
    const query = mockEsClient.esql.query as jest.Mock;
    query.mockResolvedValue({
      columns: [{ name: 'r', type: 'number' }],
      values: [],
    });

    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: mockConfig,
    });

    const promise = evaluateWith(evaluator, VALID_TRACE_ID);
    await jest.advanceTimersByTimeAsync(300_000);
    const result = await promise;

    expect(result.label).toBe('error');
    expect(result.explanation).toContain('Failed to retrieve Test Evaluator');
  });
});
