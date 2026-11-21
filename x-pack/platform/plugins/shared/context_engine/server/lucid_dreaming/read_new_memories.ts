/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { DREAMING_MEMORY_KI_TYPES } from '../../common/dreaming';

/** A memory saved since the cursor, by its id and when it was saved. */
export interface NewMemory {
  id: string;
  updatedAt: string;
}

const permissionsPath = 'permissions.kibana.privileges';

/**
 * Finds the memories of an AI index saved after the cursor and by `until`, oldest first and each
 * once, as the dreaming workflow reads them.
 */
export const readNewMemories = async ({
  esClient,
  index,
  spaceId,
  since,
  afterId,
  until,
  size,
  signal,
}: {
  esClient: ElasticsearchClient;
  index: string;
  spaceId: string;
  since: string;
  afterId: string;
  until: string;
  size: number;
  signal?: AbortSignal;
}): Promise<NewMemory[]> => {
  const response = await esClient.search<{ id?: string; updated_at?: string }>(
    {
      index,
      ignore_unavailable: true,
      allow_no_indices: true,
      size,
      sort: [{ updated_at: 'asc' }, { id: 'asc' }],
      collapse: { field: 'id' },
      _source: ['id', 'updated_at'],
      query: {
        bool: {
          filter: [
            { terms: { type: [...DREAMING_MEMORY_KI_TYPES] } },
            { range: { updated_at: { lte: until } } },
            {
              bool: {
                should: [
                  { range: { updated_at: { gt: since } } },
                  {
                    bool: {
                      filter: [{ term: { updated_at: since } }, { range: { id: { gt: afterId } } }],
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [
                  {
                    bool: {
                      must_not: {
                        nested: {
                          path: permissionsPath,
                          query: { match_all: {} },
                          ignore_unmapped: true,
                        },
                      },
                    },
                  },
                  {
                    nested: {
                      path: permissionsPath,
                      ignore_unmapped: true,
                      query: {
                        terms: { [`${permissionsPath}.space`]: [spaceId, '*'] },
                      },
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    },
    { signal }
  );
  return response.hits.hits.flatMap(({ _source: source }) =>
    source?.id && source.updated_at ? [{ id: source.id, updatedAt: source.updated_at }] : []
  );
};
