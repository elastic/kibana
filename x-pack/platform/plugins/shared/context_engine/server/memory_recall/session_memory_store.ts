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
import type { RecallCandidate, RecallSearchParams, RecallStore } from './types';

const LIMIT = RECALL_CANDIDATES.session_memory;

/** Space always, then the user and sessions when given. */
export const sessionScopeFilter = (
  space: string,
  { userId, sessionIds }: Pick<RecallSearchParams, 'userId' | 'sessionIds'>
): QueryDslQueryContainer[] => [
  { term: { space } },
  ...(userId !== undefined ? [{ term: { user_id: userId } }] : []),
  ...(sessionIds?.length ? [{ terms: { session_id: sessionIds } }] : []),
];

/**
 * Searches session memory as the internal user, since users cannot read the system data stream.
 * Tombstones have no content, so the match only finds revisions with content: each match is then
 * checked against the memory's latest revision, and a memory whose latest revision is a tombstone
 * is dropped, as `findLatestRevisions` does in the memory service.
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
    const filter = sessionScopeFilter(space, { userId, sessionIds });
    const matches = await esClient.search<StoredSessionMemory>({
      index: SESSION_MEMORY_DATA_STREAM,
      ignore_unavailable: true,
      query: { bool: { must: [{ match: { 'content.semantic_text': { query } } }], filter } },
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
      query: { bool: { filter: [{ terms: { id: ids } }, ...filter] } },
      collapse: { field: 'id' },
      sort: [{ '@timestamp': 'desc' }],
      size: ids.length,
    });
    const latestById = new Map(
      latest.hits.hits.flatMap(({ _source }) => (_source ? [[_source.id, _source] as const] : []))
    );

    // Keeps the order of the semantic match; the reranker orders all sources afterwards.
    return ids.flatMap((id): RecallCandidate[] => {
      const memory = latestById.get(id);
      if (memory?.content === undefined || memory.deleted_at !== undefined) {
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
