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
  let exhaustRetries: () => Promise<void>;

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

    // Longer than the factory's full 62s backoff, so the retry budget is always drained.
    exhaustRetries = () => jest.advanceTimersByTimeAsync(300_000);

    mockConfig = {
      name: 'Test Evaluator',
      direction: 'maximize',
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

  it('should return an unscored result without retrying when the metric is not reported', async () => {
    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: { ...mockConfig, isNotReported: () => true },
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [{ name: 'result', type: 'number' }],
      values: [[null]],
    } as any);

    const result = await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
    expect(mockEsClient.esql.query as jest.Mock).toHaveBeenCalledTimes(1);
    expect(mockLog.error).not.toHaveBeenCalled();
    expect(mockLog.warning).not.toHaveBeenCalled();
  });

  it('should still retry when the metric is reported but the value looks incomplete', async () => {
    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: { ...mockConfig, isNotReported: () => false },
    });

    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce({ columns: [{ name: 'result', type: 'number' }], values: [[null]] })
      .mockResolvedValueOnce({ columns: [{ name: 'result', type: 'number' }], values: [[7]] });

    const promise = evaluateWith(evaluator, VALID_TRACE_ID);
    await exhaustRetries();
    const result = await promise;

    expect(result.score).toBe(7);
    expect(mockEsClient.esql.query as jest.Mock).toHaveBeenCalledTimes(2);
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
    await exhaustRetries();
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
    await exhaustRetries();
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
    await exhaustRetries();
    const result = await promise;

    expect(result.score).toBeNull();
    expect(result.label).toBe('potentially_incomplete');
    expect(result.metadata).toEqual({ incomplete: true });
  });

  it('should not log an error when a usable result is still returned', async () => {
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
    await exhaustRetries();
    await promise;

    expect(mockLog.error).not.toHaveBeenCalled();
    expect(mockLog.warning).toHaveBeenCalledWith(
      expect.stringContaining('returning potentially incomplete result')
    );
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
    await exhaustRetries();
    const result = await promise;

    expect(result.label).toBe('error');
    expect(result.explanation).toContain('Failed to retrieve Test Evaluator');
  });

  it('should report unavailable/trace_store_unreadable when ES|QL rejects trace.id and the suite opted in', async () => {
    const query = mockEsClient.esql.query as jest.Mock;
    // Shape observed from a key without traces-* read privilege: the ES client folds the
    // verification_exception root cause into `message`.
    query.mockRejectedValue(
      new Error('verification_exception: Unknown column [trace.id] in [WHERE trace.id == "..."]')
    );

    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: { ...mockConfig, tracesUnavailableForSuiteMode: true },
    });

    const result = await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
    expect(result.metadata).toEqual({ reason: 'trace_store_unreadable' });
    // Deterministic failure: no retry budget burned.
    expect(query).toHaveBeenCalledTimes(1);
    // Loud, not a quiet skip.
    expect(mockLog.warning).toHaveBeenCalledWith(
      expect.stringContaining('trace store is unreadable')
    );
    expect(mockLog.error).not.toHaveBeenCalled();
  });

  it('should fail after retries when the trace store is unreadable and the suite did not opt in', async () => {
    const query = mockEsClient.esql.query as jest.Mock;
    query.mockRejectedValue(
      new Error('verification_exception: Unknown column [trace.id] in [WHERE trace.id == "..."]')
    );

    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: mockConfig,
    });

    const promise = evaluateWith(evaluator, VALID_TRACE_ID);
    await exhaustRetries();
    const result = await promise;

    expect(result.label).toBe('error');
    expect(result.metadata).toBeUndefined();
    expect(query).toHaveBeenCalledTimes(6);
  });

  it('should report unavailable/no_spans_for_suite_mode when opted in and the COUNT(*) probe returns 0', async () => {
    const query = mockEsClient.esql.query as jest.Mock;
    // Real shape of a readable-but-empty store for a STATS-without-BY query: exactly one
    // row. tokens/latency see [[null]] (SUM of nothing), tool_calls sees [[0]] (COUNT).
    query.mockResolvedValueOnce({
      columns: [{ name: 'span_count', type: 'long' }],
      values: [[0]],
    } as any);

    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: { ...mockConfig, tracesUnavailableForSuiteMode: true },
    });

    const result = await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
    expect(result.metadata).toEqual({ reason: 'no_spans_for_suite_mode' });
    // Probe first: the evaluator query never runs once the probe reports 0 spans.
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith({
      query: `FROM traces-* | WHERE trace.id == "${VALID_TRACE_ID}" | STATS span_count = COUNT(*)`,
    });
    expect(mockLog.error).not.toHaveBeenCalled();
  });

  it('should score a real 0 (not N/A) when spans exist and the metric is 0, even when opted in', async () => {
    const query = mockEsClient.esql.query as jest.Mock;
    // Probe: spans exist for the trace.
    query.mockResolvedValueOnce({
      columns: [{ name: 'span_count', type: 'long' }],
      values: [[12]],
    } as any);
    // Evaluator query: the metric itself is a genuine 0.
    query.mockResolvedValueOnce({
      columns: [{ name: 'result', type: 'number' }],
      values: [[0]],
    } as any);

    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: {
        ...mockConfig,
        // COUNT-style evaluators (tool_calls) accept 0 as a valid result.
        isResultValid: (result) => result !== null,
        tracesUnavailableForSuiteMode: true,
      },
    });

    const result = await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(result.score).toBe(0);
    expect(result.label).not.toBe('unavailable');
    expect(result.metadata).toBeUndefined();
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('should not report N/A when the store is empty but the suite did not opt in', async () => {
    const query = mockEsClient.esql.query as jest.Mock;
    // Real empty-store shape for a STATS-without-BY query: one row, not [].
    query.mockResolvedValue({
      columns: [{ name: 'result', type: 'number' }],
      values: [[null]],
    } as any);

    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: mockConfig,
    });

    const promise = evaluateWith(evaluator, VALID_TRACE_ID);
    await exhaustRetries();
    const result = await promise;

    // Without the opt-in an empty store is never N/A: retries exhaust and the outcome is
    // flagged incomplete/error, never `unavailable` with a suite-mode reason.
    expect(result.label).not.toBe('unavailable');
    expect(result.metadata?.reason).toBeUndefined();
    // No COUNT probe without the opt-in: every query is the evaluator query.
    expect(query).toHaveBeenCalledTimes(6);
    expect(
      query.mock.calls.every(([call]) => call.query === mockConfig.buildQuery(VALID_TRACE_ID))
    ).toBe(true);
  });

  it('should retry (not N/A) when opted in, spans exist, but the metric result looks incomplete', async () => {
    const query = mockEsClient.esql.query as jest.Mock;
    const spanCountResponse = {
      columns: [{ name: 'span_count', type: 'long' }],
      values: [[7]],
    } as any;
    const nullResultResponse = {
      columns: [{ name: 'result', type: 'number' }],
      values: [[null]],
    } as any;
    // The COUNT probe is deterministic ([[7]] every attempt); the evaluator query keeps
    // returning [[null]] — genuine indexing lag, not the declared empty store.
    query.mockImplementation(({ query: esql }: { query: string }) =>
      Promise.resolve(esql.includes('COUNT(*)') ? spanCountResponse : nullResultResponse)
    );

    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: { ...mockConfig, tracesUnavailableForSuiteMode: true },
    });

    const promise = evaluateWith(evaluator, VALID_TRACE_ID);
    await exhaustRetries();
    const result = await promise;

    // Spans present means the suite's no-traces mode does not apply: retries exhaust and
    // the outcome is incomplete, never `unavailable`/no_spans_for_suite_mode.
    expect(result.label).not.toBe('unavailable');
    expect(result.metadata?.reason).not.toBe('no_spans_for_suite_mode');
    // 6 attempts, each a probe + evaluator query pair.
    expect(query).toHaveBeenCalledTimes(12);
  });

  it('should still surface other unknown-column errors as failures', async () => {
    const query = mockEsClient.esql.query as jest.Mock;
    query.mockRejectedValue(
      new Error('verification_exception: Unknown column [attributes.gen_ai.usage.output_tokens]')
    );

    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: mockConfig,
    });

    const promise = evaluateWith(evaluator, VALID_TRACE_ID);
    await exhaustRetries();
    const result = await promise;

    expect(result.label).toBe('error');
    expect(mockLog.error).toHaveBeenCalled();
  });
});
