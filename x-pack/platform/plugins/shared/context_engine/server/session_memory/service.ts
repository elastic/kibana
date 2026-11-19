/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { ErrorCause, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { MAX_SESSION_MEMORY_FORGET_IDS } from '../../common/constants';
import { SESSION_MEMORY_DATA_STREAM } from './data_streams';
import type {
  ForgetResult,
  SessionMemoryScope,
  SessionMemoryService,
  StoredMemoryRevision,
  StoredSessionMemory,
  StoredTombstone,
} from './types';

// Every read and delete goes through this filter, so a memory in another space or of another user
// behaves exactly like one that does not exist.
const scopeFilter = ({ space, userId }: SessionMemoryScope): QueryDslQueryContainer[] => [
  { term: { space } },
  { term: { user_id: userId } },
];

const ignoreMissingStream = { ignore_unavailable: true };

const toErrorMessage = ({ type, reason, caused_by: cause }: ErrorCause): string => {
  const message = reason ?? type;
  return cause?.reason ? `${message}: ${cause.reason}` : message;
};

const isTombstone = (revision: StoredSessionMemory): revision is StoredTombstone =>
  revision.deleted_at !== undefined;

const toTombstone = (latest: StoredMemoryRevision, timestamp: string): StoredTombstone => ({
  '@timestamp': timestamp,
  id: latest.id,
  space: latest.space,
  session_id: latest.session_id,
  user_id: latest.user_id,
  ai_index_id: latest.ai_index_id,
  deleted_at: timestamp,
});

const toForgetResult = (
  id: string,
  latest: StoredSessionMemory | undefined,
  error: string | undefined
): ForgetResult => {
  if (error !== undefined) {
    return { id, outcome: 'failed', error };
  }
  if (!latest) {
    return { id, outcome: 'not_found' };
  }
  return { id, outcome: isTombstone(latest) ? 'already_forgotten' : 'forgotten' };
};

/**
 * Creates the service that reads and writes the session memory data stream.
 * `esClient` must send the product origin that system data streams require, as core's clients do.
 */
export const createSessionMemoryService = (
  esClient: ElasticsearchClient
): SessionMemoryService => ({
  remember: async ({ space, userId }, input) => {
    const { id = randomUUID(), sessionId, content, aiIndexIds = [], attributes = {} } = input;
    await esClient.index<StoredMemoryRevision>({
      index: SESSION_MEMORY_DATA_STREAM,
      op_type: 'create',
      document: {
        '@timestamp': new Date().toISOString(),
        id,
        space,
        session_id: sessionId,
        user_id: userId,
        ai_index_id: aiIndexIds,
        content,
        attributes,
      },
    });
    return { id };
  },

  get: async (scope, id) => {
    const response = await esClient.search<StoredSessionMemory>({
      index: SESSION_MEMORY_DATA_STREAM,
      ...ignoreMissingStream,
      query: { bool: { filter: [{ term: { id } }, ...scopeFilter(scope)] } },
      sort: [{ '@timestamp': 'desc' }],
      size: 1,
    });
    const latest = response.hits.hits[0]?._source;
    if (!latest || isTombstone(latest)) {
      return undefined;
    }
    return {
      id: latest.id,
      sessionId: latest.session_id,
      userId: latest.user_id,
      aiIndexIds: latest.ai_index_id,
      content: latest.content,
      attributes: latest.attributes ?? {},
      revisedAt: latest['@timestamp'],
    };
  },

  forget: async (scope, ids) => {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }
    if (uniqueIds.length > MAX_SESSION_MEMORY_FORGET_IDS) {
      throw new Error(`Cannot forget more than ${MAX_SESSION_MEMORY_FORGET_IDS} memories at once`);
    }

    // Collapse to the latest revision of each memory before looking at tombstones. Filtering out
    // tombstones in the query instead would surface an older revision of a forgotten memory.
    const response = await esClient.search<StoredSessionMemory>({
      index: SESSION_MEMORY_DATA_STREAM,
      ...ignoreMissingStream,
      query: { bool: { filter: [{ terms: { id: uniqueIds } }, ...scopeFilter(scope)] } },
      collapse: { field: 'id' },
      sort: [{ '@timestamp': 'desc' }],
      size: uniqueIds.length,
    });
    const latestRevisions = response.hits.hits.flatMap(({ _source }) => _source ?? []);
    const latestById = new Map(latestRevisions.map((latest) => [latest.id, latest]));

    const timestamp = new Date().toISOString();
    const tombstones = latestRevisions
      .filter((latest): latest is StoredMemoryRevision => !isTombstone(latest))
      .map((latest) => toTombstone(latest, timestamp));
    // The bulk API reports a rejected tombstone in its item instead of throwing, and keeps the order.
    const errorsById = new Map<string, string>();
    if (tombstones.length > 0) {
      const { items } = await esClient.bulk<StoredTombstone>({
        operations: tombstones.flatMap((tombstone) => [
          { create: { _index: SESSION_MEMORY_DATA_STREAM } },
          tombstone,
        ]),
      });
      items.forEach(({ create }, index) => {
        if (create?.error) {
          errorsById.set(tombstones[index].id, toErrorMessage(create.error));
        }
      });
    }

    return uniqueIds.map((id) => toForgetResult(id, latestById.get(id), errorsById.get(id)));
  },
});
