/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { RECALL_CANDIDATES } from '../../common/constants';
import { SESSION_MEMORY_DATA_STREAM } from '../session_memory/data_streams';
import type { StoredSessionMemory } from '../session_memory/types';
import type { RecallCandidate, RecallStore } from './types';

const LIMIT = RECALL_CANDIDATES.session_memory;

/**
 * Searches session memory by meaning. A match only nominates a memory: its latest revision decides
 * what comes back, so a forgotten memory never resurfaces through an older revision.
 * `esClient` must send the product origin that system data streams require.
 */
export const createSessionMemoryRecallStore = ({
  esClient,
  space,
}: {
  esClient: ElasticsearchClient;
  space: string;
}): RecallStore => ({
  source: 'session_memory',
  search: async ({ query, userId, sessionIds }) => {
    if (userId === undefined) {
      return [];
    }
    const scope: QueryDslQueryContainer[] = [{ term: { space } }, { term: { user_id: userId } }];

    const matches = await esClient.search<Pick<StoredSessionMemory, 'id'>>({
      index: SESSION_MEMORY_DATA_STREAM,
      ignore_unavailable: true,
      query: {
        bool: {
          must: [{ match: { 'content.semantic_text': query } }],
          filter: [...scope, ...(sessionIds ? [{ terms: { session_id: sessionIds } }] : [])],
        },
      },
      collapse: { field: 'id' },
      _source: ['id'],
      size: LIMIT,
    });
    const ids = matches.hits.hits.flatMap(({ _source }) => (_source ? [_source.id] : []));
    if (ids.length === 0) {
      return [];
    }

    const latest = await esClient.search<StoredSessionMemory>({
      index: SESSION_MEMORY_DATA_STREAM,
      ignore_unavailable: true,
      query: { bool: { filter: [{ terms: { id: ids } }, ...scope] } },
      collapse: { field: 'id' },
      sort: [{ '@timestamp': 'desc' }],
      size: ids.length,
    });
    const latestById = new Map(
      latest.hits.hits.flatMap(({ _source }) => (_source ? [[_source.id, _source] as const] : []))
    );

    return ids.flatMap((id): RecallCandidate[] => {
      const memory = latestById.get(id);
      if (
        memory?.content === undefined ||
        memory.deleted_at !== undefined ||
        (sessionIds !== undefined && !sessionIds.includes(memory.session_id))
      ) {
        return [];
      }
      return [
        {
          id,
          source: 'session_memory',
          content: memory.content,
          date: memory['@timestamp'],
          session_id: memory.session_id,
        },
      ];
    });
  },
});
