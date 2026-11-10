/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { BulkResponse, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { SESSION_EVENTS_DATA_STREAM, SESSION_MEMORY_DATA_STREAM } from './data_streams';
import type { ForgetOutcome } from '../../common/http_api/session_memory';
import type {
  SessionMemoryScope,
  SessionMemoryService,
  StoredSessionEvent,
  StoredSessionMemory,
} from './types';

// Every read and delete goes through this filter, so a memory in another space or of another user
// behaves exactly like one that does not exist.
const scopeFilter = ({ space, userId }: SessionMemoryScope): QueryDslQueryContainer[] => [
  { term: { space } },
  { term: { user_id: userId } },
];

const ignoreMissingStream = { ignore_unavailable: true };

// The bulk API reports rejected documents in the response instead of throwing.
const throwOnBulkErrors = (response: BulkResponse): void => {
  const error = response.items.find((item) => item.create?.error)?.create?.error;
  if (error) {
    throw new Error(`Failed to write to session memory: ${error.reason ?? error.type}`);
  }
};

const toTombstone = (latest: StoredSessionMemory, timestamp: string): StoredSessionMemory => ({
  '@timestamp': timestamp,
  id: latest.id,
  space: latest.space,
  session_id: latest.session_id,
  user_id: latest.user_id,
  ai_index_id: latest.ai_index_id,
  deleted_at: timestamp,
});

const getForgetOutcome = (latest: StoredSessionMemory | undefined): ForgetOutcome => {
  if (!latest) {
    return 'not_found';
  }
  return latest.deleted_at === undefined ? 'forgotten' : 'already_forgotten';
};

// Collapses to the latest revision of each memory before anything looks at tombstones. Filtering
// out tombstones in the query instead would surface an older revision of a forgotten memory.
const findLatestRevisions = async (
  esClient: ElasticsearchClient,
  scope: SessionMemoryScope,
  ids: readonly string[]
): Promise<StoredSessionMemory[]> => {
  const response = await esClient.search<StoredSessionMemory>({
    index: SESSION_MEMORY_DATA_STREAM,
    ...ignoreMissingStream,
    query: { bool: { filter: [{ terms: { id: [...ids] } }, ...scopeFilter(scope)] } },
    collapse: { field: 'id' },
    sort: [{ '@timestamp': 'desc' }],
    size: ids.length,
  });
  return response.hits.hits.flatMap(({ _source }) => _source ?? []);
};

/**
 * Creates the service that reads and writes the session memory data streams.
 * `esClient` must send the product origin that system data streams require, as core's clients do.
 */
export const createSessionMemoryService = (
  esClient: ElasticsearchClient
): SessionMemoryService => ({
  remember: async ({ space, userId }, input) => {
    const { id = randomUUID(), sessionId, content, aiIndexIds = [], attributes = {} } = input;
    await esClient.index<StoredSessionMemory>({
      index: SESSION_MEMORY_DATA_STREAM,
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
    if (latest?.content === undefined) {
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
      return {};
    }

    const latestRevisions = await findLatestRevisions(esClient, scope, uniqueIds);
    const latestById = new Map(latestRevisions.map((latest) => [latest.id, latest]));

    const timestamp = new Date().toISOString();
    const tombstones = latestRevisions
      .filter((latest) => latest.deleted_at === undefined)
      .map((latest) => toTombstone(latest, timestamp));
    if (tombstones.length > 0) {
      throwOnBulkErrors(
        await esClient.bulk<StoredSessionMemory>({
          operations: tombstones.flatMap((tombstone) => [
            { create: { _index: SESSION_MEMORY_DATA_STREAM } },
            tombstone,
          ]),
        })
      );
    }

    return Object.fromEntries(uniqueIds.map((id) => [id, getForgetOutcome(latestById.get(id))]));
  },

  hardDelete: async (scope, ids) => {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return {};
    }

    const foundIds = new Set(
      (await findLatestRevisions(esClient, scope, uniqueIds)).map(({ id }) => id)
    );
    if (foundIds.size > 0) {
      const { failures = [] } = await esClient.deleteByQuery({
        index: SESSION_MEMORY_DATA_STREAM,
        ...ignoreMissingStream,
        query: { bool: { filter: [{ terms: { id: [...foundIds] } }, ...scopeFilter(scope)] } },
        conflicts: 'proceed',
      });
      if (failures.length > 0) {
        throw new Error(
          `Failed to delete from session memory: ${failures[0].cause?.reason ?? 'unknown error'}`
        );
      }
    }

    return Object.fromEntries(
      uniqueIds.map((id) => [id, foundIds.has(id) ? 'deleted' : 'not_found'])
    );
  },

  saveEvent: async ({ space, userId }, input) => {
    const { id = randomUUID(), sessionId, turnId, transcript, aiIndexIds = [] } = input;
    await esClient.index<StoredSessionEvent>({
      index: SESSION_EVENTS_DATA_STREAM,
      document: {
        '@timestamp': new Date().toISOString(),
        id,
        space,
        session_id: sessionId,
        turn_id: turnId,
        user_id: userId,
        ai_index_id: aiIndexIds,
        transcript,
      },
    });
    return { id };
  },
});
