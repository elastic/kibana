/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { findLinkingRelationshipIds } from './ki_relationships';

const dest = { type: 'index' as const, value: 'ai-index-idx-memories' };

const relationshipHit = (id: string, status?: 'deleted') => ({
  sort: [id],
  inner_hits: {
    latest: {
      hits: {
        hits: [
          {
            _source: {
              id,
              ...(status && { governance: { lifecycle: { status } } }),
            },
          },
        ],
      },
    },
  },
});

describe('findLinkingRelationshipIds', () => {
  it('pages through every relationship linking the KI', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) =>
      relationshipHit(`rel-${String(index).padStart(3, '0')}`)
    );
    const search = jest
      .fn()
      .mockResolvedValueOnce({ hits: { hits: firstPage } })
      .mockResolvedValueOnce({ hits: { hits: [relationshipHit('rel-500')] } });
    const esClient = { search } as unknown as ElasticsearchClient;

    const ids = await findLinkingRelationshipIds({ esClient, dest, kiId: 'customer' });

    expect(ids).toHaveLength(501);
    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[0][0]).not.toHaveProperty('search_after');
    expect(search.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        search_after: ['rel-499'],
        sort: [{ id: 'asc' }],
        collapse: expect.objectContaining({ field: 'id' }),
        query: {
          bool: {
            filter: [
              { term: { type: 'memory.relationship' } },
              { term: { 'references.uri': 'ki://customer' } },
            ],
          },
        },
      })
    );
  });

  it('leaves out relationships whose latest revision is deleted', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: { hits: [relationshipHit('rel-1'), relationshipHit('rel-2', 'deleted')] },
      }),
    } as unknown as ElasticsearchClient;

    const ids = await findLinkingRelationshipIds({ esClient, dest, kiId: 'customer' });

    expect(ids).toEqual(['rel-1']);
  });
});
