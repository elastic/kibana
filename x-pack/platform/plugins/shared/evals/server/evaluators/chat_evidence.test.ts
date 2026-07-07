/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { extractChatEvidence } from './chat_evidence';

describe('extractChatEvidence', () => {
  const traceId = '0af7651916cd43dd8448eb211c80319c';

  const createEsClient = () => {
    const searchMock = jest.fn();
    const esClient = { search: searchMock } as unknown as ElasticsearchClient;
    return { esClient, searchMock };
  };

  it('reads the user query and agent response from _source', async () => {
    const { esClient, searchMock } = createEsClient();

    searchMock
      .mockResolvedValueOnce({
        hits: { hits: [{ _source: { attributes: { content: 'What is the payment status?' } } }] },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [{ _source: { attributes: { 'message.content': 'Payment service is healthy.' } } }],
        },
      });

    const evidence = await extractChatEvidence({ traceId, esClient });

    expect(evidence).toEqual({
      user_query: 'What is the payment status?',
      agent_response: 'Payment service is healthy.',
    });
  });

  it('queries logs-* filtered by trace and event name, sorted for first/last event', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock
      .mockResolvedValueOnce({
        hits: { hits: [{ _source: { attributes: { content: 'hi' } } }] },
      })
      .mockResolvedValueOnce({ hits: { hits: [] } });

    await extractChatEvidence({ traceId, esClient });

    const userMsgParams = searchMock.mock.calls[0][0];
    expect(userMsgParams.index).toBe('logs-*');
    expect(userMsgParams.size).toBe(1);
    expect(userMsgParams.sort).toEqual([{ '@timestamp': { order: 'asc' } }]);
    expect(userMsgParams.query.bool.filter).toEqual([
      { term: { trace_id: traceId } },
      { term: { event_name: 'gen_ai.user.message' } },
    ]);
    expect(userMsgParams._source).toEqual(['attributes.content']);

    const agentRespParams = searchMock.mock.calls[1][0];
    expect(agentRespParams.sort).toEqual([{ '@timestamp': { order: 'desc' } }]);
    expect(agentRespParams.query.bool.filter).toEqual([
      { term: { trace_id: traceId } },
      { term: { event_name: 'gen_ai.choice' } },
    ]);
    expect(agentRespParams._source).toEqual(['attributes.message.content']);
  });

  it('throws when no user message span events are found', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock.mockResolvedValueOnce({ hits: { hits: [] } });

    await expect(extractChatEvidence({ traceId, esClient })).rejects.toThrow(
      `No user message span events found for trace ${traceId}`
    );
  });

  it('returns an empty agent_response when the gen_ai.choice event has not landed yet', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock
      .mockResolvedValueOnce({
        hits: { hits: [{ _source: { attributes: { content: 'hi' } } }] },
      })
      .mockResolvedValueOnce({ hits: { hits: [] } });

    const evidence = await extractChatEvidence({ traceId, esClient });

    expect(evidence.agent_response).toBe('');
  });

  it('returns the full agent response even when it would exceed a keyword ignore_above', async () => {
    // Regression guard for the DSL-vs-ES|QL fix: a `gen_ai.choice` response longer than
    // the default keyword `ignore_above` (1024 chars) is dropped from doc values, so an
    // ES|QL read would see null. DSL `_search` reads `_source`, which keeps the full value.
    const { esClient, searchMock } = createEsClient();
    const longResponse = 'A'.repeat(5000);
    searchMock
      .mockResolvedValueOnce({
        hits: { hits: [{ _source: { attributes: { content: 'hi' } } }] },
      })
      .mockResolvedValueOnce({
        hits: { hits: [{ _source: { attributes: { 'message.content': longResponse } } }] },
      });

    const evidence = await extractChatEvidence({ traceId, esClient });

    expect(evidence.agent_response).toBe(longResponse);
  });

  it('rejects an invalid trace_id before querying', async () => {
    const { esClient, searchMock } = createEsClient();

    await expect(
      extractChatEvidence({ traceId: 'not-a-valid-hex-trace-id', esClient })
    ).rejects.toThrow('Invalid trace_id: must be a 32-character hex string');
    expect(searchMock).not.toHaveBeenCalled();
  });
});
