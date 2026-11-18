/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { StoredSessionMemory } from '../session_memory/types';
import { createSessionMemoryRecallStore } from './session_memory_store';

const hits = (sources: Array<Partial<StoredSessionMemory>>) =>
  ({
    hits: { hits: sources.map((_source, index) => ({ _index: '.ds', _id: `${index}`, _source })) },
  } as never);

const revision = (overrides: Partial<StoredSessionMemory>): StoredSessionMemory => ({
  '@timestamp': '2026-11-18T10:00:00.000Z',
  id: 'memory-1',
  space: 'default',
  session_id: 'conversation-a',
  user_id: 'profile-1',
  ai_index_id: [],
  content: 'The user prefers metric units.',
  ...overrides,
});

describe('createSessionMemoryRecallStore', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const store = createSessionMemoryRecallStore({ esClient, space: 'default' });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns the latest revision of each match and drops memories whose latest revision is a tombstone', async () => {
    esClient.search
      .mockResolvedValueOnce(hits([{ id: 'memory-1' }, { id: 'memory-2' }]))
      .mockResolvedValueOnce(
        hits([
          revision({ content: 'The user prefers metric units, in kilometers.' }),
          revision({ id: 'memory-2', content: undefined, deleted_at: '2026-11-18T11:00:00.000Z' }),
        ])
      );

    await expect(store.search({ query: 'units', userId: 'profile-1' })).resolves.toEqual([
      {
        id: 'memory-1',
        source: 'session_memory',
        content: 'The user prefers metric units, in kilometers.',
        date: '2026-11-18T10:00:00.000Z',
        session_id: 'conversation-a',
      },
    ]);
  });

  it('collapses the semantic match by memory and filters on space, user and sessions', async () => {
    esClient.search.mockResolvedValueOnce(hits([]));

    await store.search({ query: 'units', userId: 'profile-1', sessionIds: ['conversation-a'] });

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        collapse: { field: 'id' },
        query: {
          bool: {
            must: [{ match: { 'content.semantic_text': { query: 'units' } } }],
            filter: [
              { term: { space: 'default' } },
              { term: { user_id: 'profile-1' } },
              { terms: { session_id: ['conversation-a'] } },
            ],
          },
        },
      })
    );
  });
});
