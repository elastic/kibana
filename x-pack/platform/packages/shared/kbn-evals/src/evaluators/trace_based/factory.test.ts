/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTraceBasedEvaluator,
  normalizeTraceIds,
  traceIdInClause,
  type TraceBasedEvaluatorConfig,
} from './factory';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

const VALID_TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const VALID_TRACE_ID_2 = '1234567890abcdef1234567890abcdef';

const evaluateWith = (
  evaluator: ReturnType<typeof createTraceBasedEvaluator>,
  traceId: string | string[] | undefined | null
) => evaluator.evaluate({ input: {}, output: { traceId }, expected: {}, metadata: {} });

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
      buildQuery: (traceIds: string[]) => `FROM traces-* | WHERE ${traceIdInClause(traceIds)}`,
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

  it('should return unavailable when traceId is missing', async () => {
    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: mockConfig,
    });

    const result = await evaluateWith(evaluator, undefined);

    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });

  it('should accept a string[] traceId from a HITL-resume conversation and emit an IN-clause query', async () => {
    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: mockConfig,
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [{ name: 'result', type: 'number' }],
      values: [[7]],
    } as any);

    const result = await evaluateWith(evaluator, [VALID_TRACE_ID, VALID_TRACE_ID_2]);

    expect(result.score).toBe(7);
    expect(mockEsClient.esql.query as jest.Mock).toHaveBeenCalledWith({
      query: `FROM traces-* | WHERE trace.id IN ("${VALID_TRACE_ID}", "${VALID_TRACE_ID_2}")`,
    });
  });

  it('should drop invalid IDs from a mixed array and query only the valid ones', async () => {
    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: mockConfig,
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [{ name: 'result', type: 'number' }],
      values: [[3]],
    } as any);

    const result = await evaluateWith(evaluator, [VALID_TRACE_ID, 'not-a-trace', VALID_TRACE_ID_2]);

    expect(result.score).toBe(3);
    expect(mockEsClient.esql.query as jest.Mock).toHaveBeenCalledWith({
      query: `FROM traces-* | WHERE trace.id IN ("${VALID_TRACE_ID}", "${VALID_TRACE_ID_2}")`,
    });
  });

  it('should return error when all IDs in array are invalid', async () => {
    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: mockConfig,
    });

    const result = await evaluateWith(evaluator, ['nope', 'also-nope']);

    expect(result.label).toBe('error');
    expect(result.explanation).toBe('Invalid traceId');
    expect(mockEsClient.esql.query as jest.Mock).not.toHaveBeenCalled();
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

  it('emits a == clause for a single trace ID (cleaner logs)', async () => {
    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: mockConfig,
    });

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [{ name: 'result', type: 'number' }],
      values: [[1]],
    } as any);

    await evaluateWith(evaluator, VALID_TRACE_ID);

    expect(mockEsClient.esql.query as jest.Mock).toHaveBeenCalledWith({
      query: `FROM traces-* | WHERE trace.id == "${VALID_TRACE_ID}"`,
    });
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

describe('normalizeTraceIds', () => {
  const VALID = '0af7651916cd43dd8448eb211c80319c';
  const VALID_2 = '1234567890abcdef1234567890abcdef';

  it('returns [] for undefined / null / empty', () => {
    expect(normalizeTraceIds(undefined)).toEqual([]);
    expect(normalizeTraceIds(null)).toEqual([]);
    expect(normalizeTraceIds('')).toEqual([]);
    expect(normalizeTraceIds([])).toEqual([]);
  });

  it('wraps a single valid string into a 1-element array', () => {
    expect(normalizeTraceIds(VALID)).toEqual([VALID]);
  });

  it('passes through an array of valid IDs', () => {
    expect(normalizeTraceIds([VALID, VALID_2])).toEqual([VALID, VALID_2]);
  });

  it('drops invalid IDs from a mixed array', () => {
    expect(normalizeTraceIds([VALID, 'invalid', VALID_2, ''])).toEqual([VALID, VALID_2]);
  });

  it('returns [] when no IDs in the array are valid', () => {
    expect(normalizeTraceIds(['invalid', 'also-not-hex'])).toEqual([]);
  });

  it('rejects non-string array members', () => {
    expect(normalizeTraceIds([VALID, 123, null, undefined, {}])).toEqual([VALID]);
  });
});

describe('traceIdInClause', () => {
  const A = '0af7651916cd43dd8448eb211c80319c';
  const B = '1234567890abcdef1234567890abcdef';

  it('emits a == clause for a single id', () => {
    expect(traceIdInClause([A])).toBe(`trace.id == "${A}"`);
  });

  it('emits an IN-clause for multiple ids', () => {
    expect(traceIdInClause([A, B])).toBe(`trace.id IN ("${A}", "${B}")`);
  });

  it('throws if given an empty array (caller bug)', () => {
    expect(() => traceIdInClause([])).toThrow('traceIdInClause requires at least one trace ID');
  });
});
