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

  it('queries chat spans and tool spans for the trace and maps groundedness evidence', async () => {
    const logger = loggingSystemMock.createLogger();
    const { esClient, queryMock } = createEsClient();

    const inputMessages = JSON.stringify([
      {
        role: 'user',
        parts: [{ type: 'text', content: 'What is the payment status?' }],
      },
    ]);
    const outputMessages = JSON.stringify([
      {
        role: 'assistant',
        finish_reason: 'stop',
        parts: [{ type: 'text', content: 'Payment service is healthy.' }],
      },
    ]);

    queryMock
      // 1. Chat spans from traces-*
      .mockResolvedValueOnce({
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'attributes.gen_ai.input.messages', type: 'keyword' },
          { name: 'attributes.gen_ai.output.messages', type: 'keyword' },
        ],
        values: [['2026-06-26T10:00:00.000Z', inputMessages, outputMessages]],
      })
      // 2. Tool spans from traces-*
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

    expect(queryMock).toHaveBeenCalledTimes(2);

    // Both queries use traces-* with trace.id
    expect(queryMock.mock.calls[0][0]?.query).toContain('trace.id == ?trace_id');
    expect(queryMock.mock.calls[0][0]?.params).toEqual([{ trace_id: traceId }]);
    expect(queryMock.mock.calls[0][0]?.query).toContain('gen_ai.operation.name == "chat"');

    expect(queryMock.mock.calls[1][0]?.query).toContain('trace.id == ?trace_id');
    expect(queryMock.mock.calls[1][0]?.params).toEqual([{ trace_id: traceId }]);

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
