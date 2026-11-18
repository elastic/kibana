/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createSessionEventsRecallStore } from './session_events_store';

const event = (id: string, sessionId: string, type: 'user' | 'assistant') => ({
  _index: '.ds',
  _id: `${sessionId}-${id}-${Math.random()}`,
  _source: {
    id,
    session_id: sessionId,
    event_at: '2026-11-18T10:00:00.000Z',
    type,
    content: `${type} said ${id}`,
  },
});

describe('createSessionEventsRecallStore', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const store = createSessionEventsRecallStore({ esClient, space: 'default' });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('drops resent duplicates by session and event id, and sets role and session_id', async () => {
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          event('round-1:user', 'conversation-a', 'user'),
          event('round-1:user', 'conversation-a', 'user'),
          event('round-1:user', 'conversation-b', 'user'),
          event('round-1:answer', 'conversation-a', 'assistant'),
        ],
      },
    } as never);

    const candidates = await store.search({ query: 'units', userId: 'profile-1' });

    expect(candidates.map(({ id, role, session_id: sessionId }) => [id, role, sessionId])).toEqual([
      ['round-1:user', 'user', 'conversation-a'],
      ['round-1:user', 'user', 'conversation-b'],
      ['round-1:answer', 'assistant', 'conversation-a'],
    ]);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            must: [{ match: { 'content.semantic_text': { query: 'units' } } }],
            filter: [
              { term: { space: 'default' } },
              { term: { user_id: 'profile-1' } },
              { terms: { type: ['user', 'assistant'] } },
            ],
          },
        },
      })
    );
  });
});
