/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  inputTokensEvaluatorDef,
  latencyEvaluatorDef,
  outputTokensEvaluatorDef,
  toolCallsEvaluatorDef,
} from '.';

describe('trace metrics evaluators', () => {
  const traceId = '0af7651916cd43dd8448eb211c80319c';
  const log = loggingSystemMock.createLogger();
  const round = {
    input: { message: '' },
    response: { message: '' },
    steps: [],
  };

  const createEsClient = () => {
    const searchMock = jest.fn();
    const esClient = {
      search: searchMock,
    } as unknown as ElasticsearchClient;

    return { esClient, searchMock };
  };

  it('returns latency in seconds from duration max aggregation', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock.mockResolvedValue({
      hits: { hits: [] },
      aggregations: {
        total_duration_ns: { value: 2_500_000_000 },
      },
    });

    await expect(
      latencyEvaluatorDef.evaluate({ trace: { traceId, esClient }, round, log })
    ).resolves.toEqual({
      scores: [{ name: 'latency', score: 2.5 }],
    });
    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'traces-*',
        size: 0,
        aggs: {
          total_duration_ns: {
            max: { field: 'duration' },
          },
        },
      })
    );
  });

  it('returns input token sum from aggregation', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock.mockResolvedValue({
      hits: { hits: [] },
      aggregations: {
        input_tokens: { value: 123 },
      },
    });

    await expect(
      inputTokensEvaluatorDef.evaluate({
        trace: { traceId, esClient },
        round,
        log,
      })
    ).resolves.toEqual({
      scores: [{ name: 'input_tokens', score: 123 }],
    });
  });

  it('returns output token sum from aggregation', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock.mockResolvedValue({
      hits: { hits: [] },
      aggregations: {
        output_tokens: { value: 456 },
      },
    });

    await expect(
      outputTokensEvaluatorDef.evaluate({
        trace: { traceId, esClient },
        round,
        log,
      })
    ).resolves.toEqual({
      scores: [{ name: 'output_tokens', score: 456 }],
    });
  });

  it('returns tool call count from filter aggregation doc_count', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock.mockResolvedValue({
      hits: { hits: [] },
      aggregations: {
        tool_calls: { doc_count: 3 },
      },
    });

    await expect(
      toolCallsEvaluatorDef.evaluate({
        trace: { traceId, esClient },
        round,
        log,
      })
    ).resolves.toEqual({
      scores: [{ name: 'tool_calls', score: 3 }],
    });
  });

  it('returns unavailable when a metric aggregation is missing', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock.mockResolvedValue({
      hits: { hits: [] },
      aggregations: {},
    });

    await expect(
      inputTokensEvaluatorDef.evaluate({
        trace: { traceId, esClient },
        round,
        log,
      })
    ).resolves.toEqual({
      scores: [{ name: 'input_tokens', label: 'unavailable' }],
    });
  });
});
