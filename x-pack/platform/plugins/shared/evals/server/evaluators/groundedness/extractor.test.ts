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

  it('reads chat evidence and tool spans from _source and maps groundedness evidence', async () => {
    const logger = loggingSystemMock.createLogger();
    const { esClient, searchMock } = createEsClient();

    searchMock
      // 0. Root span probe from traces-* (the resolver checks whether the trace's
      //    root is an execute_tool span). A conversation trace has a non-tool root,
      //    so tool-evidence reconstruction is skipped and conversation evidence is used.
      .mockResolvedValueOnce({
        hits: { hits: [{ _source: { attributes: { 'elastic.inference.span.kind': 'CHAIN' } } }] },
      })
      // 1. User message span event from logs-* (reads _source)
      .mockResolvedValueOnce({
        hits: { hits: [{ _source: { attributes: { content: 'What is the payment status?' } } }] },
      })
      // 2. Agent response span event (gen_ai.choice) from logs-* (reads _source)
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                attributes: {
                  'message.content': 'Payment service is healthy.',
                  finish_reason: 'stop',
                },
              },
            },
          ],
        },
      })
      // 3. Tool spans from traces-* (reads _source, not ES|QL — large results are
      //    present in _source but null in doc values due to `ignore_above`).
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

    expect(searchMock).toHaveBeenCalledTimes(4);

    // Root probe reads traces-* for the parentless root span.
    const rootSearch = searchMock.mock.calls[0][0];
    expect(rootSearch.index).toBe('traces-*');
    expect(rootSearch.query.bool.must_not).toEqual([{ exists: { field: 'parent_span_id' } }]);

    // Chat-evidence searches read logs-* `_source`, filtered by trace_id + event_name.
    const userSearch = searchMock.mock.calls[1][0];
    expect(userSearch.query.bool.filter).toContainEqual({ term: { trace_id: traceId } });
    expect(userSearch.query.bool.filter).toContainEqual({
      term: { event_name: 'gen_ai.user.message' },
    });

    const agentSearch = searchMock.mock.calls[2][0];
    expect(agentSearch.query.bool.filter).toContainEqual({ term: { event_name: 'gen_ai.choice' } });
    expect(agentSearch.query.bool.must_not).toEqual([
      { term: { 'attributes.finish_reason': 'tool_calls' } },
    ]);

    // Tool spans read traces-* `_source`, filtered by trace.id + span kind = TOOL.
    const toolSearch = searchMock.mock.calls[3][0];
    expect(toolSearch.index).toBe('traces-*');
    expect(toolSearch.query.bool.filter).toContainEqual({ term: { 'trace.id': traceId } });
    expect(toolSearch.query.bool.filter).toContainEqual({
      term: { 'attributes.elastic.inference.span.kind': 'TOOL' },
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
