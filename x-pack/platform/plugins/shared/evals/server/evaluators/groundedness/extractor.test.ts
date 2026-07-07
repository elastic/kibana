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
          hits: [{ _source: { attributes: { content: 'What is the payment status?' } } }],
        },
      })
      // 2. Agent response span event (gen_ai.choice) from logs-*
      .mockResolvedValueOnce({
        hits: {
          hits: [{ _source: { attributes: { 'message.content': 'Payment service is healthy.' } } }],
        },
      })
      // 3. Tool spans from traces-*
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                attributes: {
                  'gen_ai.tool.call.id': 'call-1',
                  'gen_ai.tool.name': 'health_check',
                  'gen_ai.tool.call.arguments': '{"service":"payments"}',
                  'gen_ai.tool.call.result': '{"status":"healthy"}',
                },
              },
            },
          ],
        },
      });

    const evidence = await extractGroundednessEvidence({ traceId, esClient }, logger);

    expect(searchMock).toHaveBeenCalledTimes(3);

    // Logs queries filter on trace_id (bound as a DSL term, not interpolated)
    expect(searchMock.mock.calls[0][0]?.index).toBe('logs-*');
    expect(searchMock.mock.calls[0][0]?.query.bool.filter).toEqual([
      { term: { trace_id: traceId } },
      { term: { event_name: 'gen_ai.user.message' } },
    ]);

    expect(searchMock.mock.calls[1][0]?.index).toBe('logs-*');
    expect(searchMock.mock.calls[1][0]?.query.bool.filter).toEqual([
      { term: { trace_id: traceId } },
      { term: { event_name: 'gen_ai.choice' } },
    ]);

    // Traces query filters on trace.id
    expect(searchMock.mock.calls[2][0]?.index).toBe('traces-*');
    expect(searchMock.mock.calls[2][0]?.query.bool.filter).toEqual([
      { term: { 'trace.id': traceId } },
      { term: { 'attributes.elastic.inference.span.kind': 'TOOL' } },
    ]);

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

  it('returns full field values that would have been dropped by ES|QL doc-value reads', async () => {
    // Regression guard: a keyword field whose value exceeds `ignore_above` is excluded
    // from doc values (ES|QL would see null) but stays intact in `_source`, which DSL
    // `_search` reads from. Simulate a long agent response to lock in that behavior.
    const logger = loggingSystemMock.createLogger();
    const { esClient, searchMock } = createEsClient();
    const longResponse = 'A'.repeat(5000);

    searchMock
      .mockResolvedValueOnce({
        hits: { hits: [{ _source: { attributes: { content: 'hi' } } }] },
      })
      .mockResolvedValueOnce({
        hits: { hits: [{ _source: { attributes: { 'message.content': longResponse } } }] },
      })
      .mockResolvedValueOnce({ hits: { hits: [] } });

    const evidence = await extractGroundednessEvidence({ traceId, esClient }, logger);

    expect(evidence.agent_response).toHaveLength(5000);
    expect(evidence.agent_response).toBe(longResponse);
  });
});
