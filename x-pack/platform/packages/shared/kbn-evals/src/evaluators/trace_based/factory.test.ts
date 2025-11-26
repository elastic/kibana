/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTraceBasedEvaluator, type TraceBasedEvaluatorConfig } from './factory';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

describe('createTraceBasedEvaluator', () => {
  let mockEsClient: jest.Mocked<EsClient>;
  let mockLog: jest.Mocked<ToolingLog>;
  let mockConfig: TraceBasedEvaluatorConfig;

  beforeEach(() => {
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
      extractResult: (response) => response.values[0][0] as number,
    };
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

    await evaluator.evaluate({
      input: {},
      output: { traceId: '0af7651916cd43dd8448eb211c80319c' },
      expected: {},
      metadata: {},
    });

    expect(mockEsClient.esql.query as jest.Mock).toHaveBeenCalledWith({
      query: 'FROM traces-* | WHERE trace.id == "0af7651916cd43dd8448eb211c80319c"',
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

    const result = await evaluator.evaluate({
      input: {},
      output: { traceId: '1234567890abcdef1234567890abcdef' },
      expected: {},
      metadata: {},
    });

    expect(result.score).toBe(100);
  });

  it('should return error for invalid trace ID', async () => {
    const evaluator = createTraceBasedEvaluator({
      traceEsClient: mockEsClient,
      log: mockLog,
      config: mockConfig,
    });

    const result = await evaluator.evaluate({
      input: {},
      output: { traceId: 'invalid-trace-id' },
      expected: {},
      metadata: {},
    });

    expect(result.label).toBe('error');
    expect(result.explanation).toBe('Invalid traceId');
  });
});
