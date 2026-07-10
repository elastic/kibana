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
    const esClient = {
      search: searchMock,
    } as unknown as ElasticsearchClient;
    return { esClient, searchMock };
  };

  it('returns empty agent response when content field is absent/unmapped', async () => {
    const { esClient, searchMock } = createEsClient();

    searchMock
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: { '@timestamp': '2026-06-26T10:00:00.000Z', 'attributes.content': 'hello' },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [{ _source: { '@timestamp': '2026-06-26T10:00:01.000Z', span_id: 'span-2' } }],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      });

    await expect(extractChatEvidence({ traceId, esClient })).resolves.toEqual({
      user_query: 'hello',
      agent_response: '',
    });
  });

  it('round-trips large content values over 32KB', async () => {
    const { esClient, searchMock } = createEsClient();
    const largeUserMessage = 'u'.repeat(40 * 1024);
    const largeAgentResponse = 'a'.repeat(36 * 1024);

    searchMock
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:00.000Z',
                'attributes.content': largeUserMessage,
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-06-26T10:00:01.000Z',
                'attributes.message.content': largeAgentResponse,
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      });

    await expect(extractChatEvidence({ traceId, esClient })).resolves.toEqual({
      user_query: largeUserMessage,
      agent_response: largeAgentResponse,
    });
  });
});
