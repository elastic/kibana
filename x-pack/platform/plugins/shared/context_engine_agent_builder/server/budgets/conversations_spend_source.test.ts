/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { AI_INDEX_ATTACHMENT_TYPE } from '../../common/agent_builder_attachments';
import { CONTEXT_ENGINE_SETUP_AGENT_ID } from '../../common/agent_builder_agents';
import { createConversationsSpendSource } from './conversations_spend_source';

const from = new Date('2026-10-01T00:00:00.000Z');
const to = new Date('2026-11-01T00:00:00.000Z');

const round = (startedAt: string, connectorId: string, input: number, output: number) => ({
  started_at: startedAt,
  model_usage: {
    connector_id: connectorId,
    input_tokens: input,
    output_tokens: output,
    cached_input_tokens: 10,
    llm_calls: 1,
  },
});

const hit = (attachmentId: string, rounds: Array<ReturnType<typeof round>>) => ({
  _index: '.chat-conversations',
  _id: `${attachmentId}-conversation`,
  _source: {
    attachments: [{ id: attachmentId, type: AI_INDEX_ATTACHMENT_TYPE }],
    conversation_rounds: rounds,
  },
  sort: [1],
});

describe('createConversationsSpendSource', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.openPointInTime.mockResponse({
      id: 'pit-1',
      _shards: { total: 1, successful: 1, failed: 0 },
    });
    esClient.closePointInTime.mockResponse({ succeeded: true, num_freed: 1 });
  });

  const getUsage = (aiIndexIds: string[] = ['tickets', 'docs']) =>
    createConversationsSpendSource({ getEsClient: () => esClient }).getUsage({
      spaceId: 'default',
      from,
      to,
      aiIndices: aiIndexIds.map((id) => ({ id, automationWorkflowIds: [] })),
    });

  it('sums the setup agent rounds of the period per AI index and connector', async () => {
    esClient.search.mockResponse({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: {
        hits: [
          hit('tickets', [
            round('2026-09-30T23:00:00.000Z', '.haiku', 1_000, 100),
            round('2026-10-02T10:00:00.000Z', '.haiku', 200, 20),
            round('2026-10-03T10:00:00.000Z', '.haiku', 300, 30),
          ]),
          hit('docs', [round('2026-10-05T10:00:00.000Z', 'my-openai', 50, 5)]),
        ],
      },
    });

    await expect(getUsage()).resolves.toEqual([
      {
        aiIndexId: 'tickets',
        connectorId: '.haiku',
        inputTokens: 500,
        outputTokens: 50,
        cachedTokens: 20,
      },
      {
        aiIndexId: 'docs',
        connectorId: 'my-openai',
        inputTokens: 50,
        outputTokens: 5,
        cachedTokens: 10,
      },
    ]);

    const [searchArgs] = esClient.search.mock.calls[0] as [{ query: unknown }];
    const query = JSON.stringify(searchArgs.query);
    expect(query).toContain(`"agent_id":"${CONTEXT_ENGINE_SETUP_AGENT_ID}"`);
    expect(query).toContain(`"attachments.type":"${AI_INDEX_ATTACHMENT_TYPE}"`);
    expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-1' });
  });

  it('skips the read when the space has no AI indices', async () => {
    await expect(getUsage([])).resolves.toEqual([]);
    expect(esClient.openPointInTime).not.toHaveBeenCalled();
  });

  it('reports nothing when the conversations index does not exist yet', async () => {
    esClient.openPointInTime.mockRejectedValue(
      new errors.ResponseError({
        statusCode: 404,
        body: {},
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );

    await expect(getUsage()).resolves.toEqual([]);
  });
});
