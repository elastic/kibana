/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { extractGroundednessEvidence } from './extractor';

describe('groundedness trace extractor', () => {
  const traceId = '0af7651916cd43dd8448eb211c80319c';

  const createEsClient = () => {
    const queryMock = jest.fn();
    const esClient = {
      esql: {
        query: queryMock,
      },
    } as unknown as ElasticsearchClient;

    return { esClient, queryMock };
  };

  it('queries span events and tool spans for the trace and maps groundedness evidence', async () => {
    const logger = loggingSystemMock.createLogger();
    const { esClient, queryMock } = createEsClient();

    queryMock
      // 1. User message span event from logs-*
      .mockResolvedValueOnce({
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'attributes.content', type: 'keyword' },
          { name: 'span_id', type: 'keyword' },
        ],
        values: [['2026-06-26T10:00:00.000Z', 'What is the payment status?', 'span-001']],
      })
      // 2. Agent response span event (gen_ai.choice) from logs-*
      .mockResolvedValueOnce({
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'attributes.message.content', type: 'keyword' },
          { name: 'span_id', type: 'keyword' },
        ],
        values: [['2026-06-26T10:00:01.000Z', 'Payment service is healthy.', 'span-002']],
      })
      // 3. Tool spans from traces-*
      .mockResolvedValueOnce({
        columns: [
          { name: 'attributes.gen_ai.tool.call.id', type: 'keyword' },
          { name: 'attributes.gen_ai.tool.name', type: 'keyword' },
          { name: 'attributes.gen_ai.tool.call.arguments', type: 'keyword' },
          { name: 'attributes.gen_ai.tool.call.result', type: 'keyword' },
          { name: '@timestamp', type: 'date' },
        ],
        values: [
          [
            'call-1',
            'health_check',
            '{"service":"payments"}',
            '{"status":"healthy"}',
            '2026-06-26T10:00:00.500Z',
          ],
        ],
      });

    const evidence = await extractGroundednessEvidence({ traceId, esClient }, logger);

    expect(queryMock).toHaveBeenCalledTimes(3);

    // Logs queries use ?trace_id placeholder with bound params
    expect(queryMock.mock.calls[0][0]?.query).toContain('trace_id == ?trace_id');
    expect(queryMock.mock.calls[0][0]?.params).toEqual([{ trace_id: traceId }]);
    expect(queryMock.mock.calls[0][0]?.query).toContain('gen_ai.user.message');

    expect(queryMock.mock.calls[1][0]?.query).toContain('trace_id == ?trace_id');
    expect(queryMock.mock.calls[1][0]?.params).toEqual([{ trace_id: traceId }]);
    expect(queryMock.mock.calls[1][0]?.query).toContain('gen_ai.choice');

    // Traces query uses trace.id with bound params
    expect(queryMock.mock.calls[2][0]?.query).toContain('trace.id == ?trace_id');
    expect(queryMock.mock.calls[2][0]?.params).toEqual([{ trace_id: traceId }]);

    expect(evidence).toEqual({
      user_query: 'What is the payment status?',
      agent_response: 'Payment service is healthy.',
      tool_call_history: [
        {
          tool_call_id: 'call-1',
          tool_id: 'health_check',
          arguments: { service: 'payments' },
          result: { status: 'healthy' },
        },
      ],
    });
  });
});
