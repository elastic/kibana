/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { extractConversationEvidence } from './chat_evidence';

describe('extractConversationEvidence', () => {
  const traceId = '0af7651916cd43dd8448eb211c80319c';

  const createEsClient = () => {
    const searchMock = jest.fn();
    const esClient = { search: searchMock } as unknown as ElasticsearchClient;
    return { esClient, searchMock };
  };

  const userHit = (content: string) => ({
    hits: { hits: [{ _source: { attributes: { content } } }] },
  });
  const agentHit = (content: string, finishReason = 'stop') => ({
    hits: {
      hits: [
        { _source: { attributes: { 'message.content': content, finish_reason: finishReason } } },
      ],
    },
  });
  const emptyHits = { hits: { hits: [] } };

  it('returns the user query and agent response from span events (reading _source)', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock
      .mockResolvedValueOnce(userHit('What is the payment status?'))
      .mockResolvedValueOnce(agentHit('Payment service is healthy.'));

    await expect(extractConversationEvidence({ traceId, esClient })).resolves.toEqual({
      user_query: 'What is the payment status?',
      agent_response: 'Payment service is healthy.',
    });
  });

  it('excludes intermediate tool-call turns when selecting the agent response', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock
      .mockResolvedValueOnce(userHit('List the indices.'))
      .mockResolvedValueOnce(agentHit('Here are the indices: index-a, index-b.'));

    await extractConversationEvidence({ traceId, esClient });

    // Second call is the agent-response search; it must skip `tool_calls` turns
    // (the intent-only turns) so the terminal answer is graded, not the intent.
    const agentSearchBody = searchMock.mock.calls[1][0];
    expect(agentSearchBody.query.bool.must_not).toEqual([
      { term: { 'attributes.finish_reason': 'tool_calls' } },
    ]);
    expect(agentSearchBody.sort).toEqual([{ '@timestamp': { order: 'desc' } }]);
  });

  it('returns an empty agent response when no terminal turn exists yet', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock.mockResolvedValueOnce(userHit('List the indices.')).mockResolvedValueOnce(emptyHits);

    await expect(extractConversationEvidence({ traceId, esClient })).resolves.toEqual({
      user_query: 'List the indices.',
      agent_response: '',
    });
  });

  it('returns null when no user message span events are found (not a conversation)', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock.mockResolvedValueOnce(emptyHits);

    await expect(extractConversationEvidence({ traceId, esClient })).resolves.toBeNull();
    // No agent-response search once the conversation is ruled out.
    expect(searchMock).toHaveBeenCalledTimes(1);
  });

  it('rethrows search errors unchanged', async () => {
    const { esClient, searchMock } = createEsClient();
    searchMock.mockRejectedValueOnce(new Error('connection refused'));

    await expect(extractConversationEvidence({ traceId, esClient })).rejects.toThrow(
      'connection refused'
    );
  });

  it('rejects an invalid trace id without querying', async () => {
    const { esClient, searchMock } = createEsClient();

    await expect(extractConversationEvidence({ traceId: 'not-a-trace', esClient })).rejects.toThrow(
      /Invalid trace_id/
    );
    expect(searchMock).not.toHaveBeenCalled();
  });
});
