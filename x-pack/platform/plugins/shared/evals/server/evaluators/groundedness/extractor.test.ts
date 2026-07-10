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
    const searchMock = jest.fn();
    const esClient = {
      search: searchMock,
    } as unknown as ElasticsearchClient;

    return { esClient, searchMock };
  };

  it('queries span events and tool spans for the trace and maps groundedness evidence', async () => {
    const logger = loggingSystemMock.createLogger();
    const { esClient, searchMock } = createEsClient();

    searchMock
      // 1. User message span event from logs-*
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:00.000Z',
                'attributes.content': 'What is the payment status?',
                span_id: 'span-001',
              },
            },
          ],
        },
      })
      // 2. Agent response span event (gen_ai.choice) from logs-*
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:01.000Z',
                'attributes.message.content': 'Payment service is healthy.',
                span_id: 'span-002',
              },
            },
          ],
        },
      })
      // 3. Tool spans from traces-*
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                'attributes.gen_ai.tool.call.id': 'call-1',
                'attributes.gen_ai.tool.name': 'health_check',
                'attributes.gen_ai.tool.call.arguments': '{"service":"payments"}',
                'attributes.gen_ai.tool.call.result': '{"status":"healthy"}',
                '@timestamp': '2026-06-26T10:00:00.500Z',
              },
            },
          ],
        },
      });

    const evidence = await extractGroundednessEvidence({ traceId, esClient }, logger);

    expect(searchMock).toHaveBeenCalledTimes(3);

    expect(searchMock.mock.calls[0][0]).toMatchObject({
      index: 'logs-*',
      ignore_unavailable: true,
      size: 1,
      sort: [{ '@timestamp': { order: 'asc' } }],
      query: {
        bool: {
          filter: [
            { term: { trace_id: traceId } },
            { term: { event_name: 'gen_ai.user.message' } },
          ],
        },
      },
    });

    expect(searchMock.mock.calls[1][0]).toMatchObject({
      index: 'logs-*',
      ignore_unavailable: true,
      size: 1,
      sort: [{ '@timestamp': { order: 'desc' } }],
      query: {
        bool: {
          filter: [{ term: { trace_id: traceId } }, { term: { event_name: 'gen_ai.choice' } }],
        },
      },
    });

    expect(searchMock.mock.calls[2][0]).toMatchObject({
      index: 'traces-*',
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { term: { 'trace.id': traceId } },
            { term: { 'attributes.elastic.inference.span.kind': 'TOOL' } },
          ],
        },
      },
    });

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
