/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { BulkResponse, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { CoreStart, ElasticsearchClient } from '@kbn/core/server';
import { SESSION_EVENTS_DATA_STREAM, SESSION_MEMORY_DATA_STREAM } from './data_streams';
import type {
  ForgetOutcome,
  SessionMemory,
  SessionMemoryScope,
  SessionMemoryService,
  StoredSessionEvent,
  StoredSessionMemory,
} from './types';

interface SessionMemoryServiceDeps {
  /** Internal user client. Core's client sends the product origin system data streams require. */
  esClient: ElasticsearchClient;
  generateId?: () => string;
  now?: () => Date;
}

// Every read and delete goes through this filter, so a memory in another space or of another user
// behaves exactly like one that does not exist.
const scopeFilter = ({ space, userId }: SessionMemoryScope): QueryDslQueryContainer[] => [
  { term: { space } },
  { term: { user_id: userId } },
];

// Elasticsearch creates each stream on its first write, so reads and deletes before that find nothing
// instead of failing.
const ignoreMissingStream = { ignore_unavailable: true };

// The bulk API reports rejected documents in the response instead of throwing.
const throwOnBulkErrors = (response: BulkResponse): void => {
  const error = response.items.find((item) => item.create?.error)?.create?.error;
  if (error) {
    throw new Error(`Failed to write to session memory: ${error.reason ?? error.type}`);
  }
};

const toSessionMemory = (stored: StoredSessionMemory, content: string): SessionMemory => ({
  id: stored.id,
  sessionId: stored.session_id,
  userId: stored.user_id,
  aiIndexIds: stored.ai_index_id,
  content,
  attributes: stored.attributes ?? {},
  revisedAt: stored['@timestamp'],
});

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

/** Creates the service that reads and writes the session memory data streams. */
export const createSessionMemoryService = ({
  esClient,
  generateId = randomUUID,
  now = () => new Date(),
}: SessionMemoryServiceDeps): SessionMemoryService => ({
  remember: async ({ space, userId }, input) => {
    const { id = generateId(), sessionId, content, aiIndexIds = [], attributes = {} } = input;
    await esClient.index<StoredSessionMemory>({
      index: SESSION_MEMORY_DATA_STREAM,
      // A data stream accepts only `create`.
      op_type: 'create',
      document: {
        '@timestamp': now().toISOString(),
        id,
        space,
        session_id: sessionId,
        user_id: userId,
        ai_index_id: [...aiIndexIds],
        content,
        attributes: { ...attributes },
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
    if (!latest || latest.deleted_at !== undefined || latest.content === undefined) {
      return undefined;
    }
    return toSessionMemory(latest, latest.content);
  },

  forget: async (scope, ids) => {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return {};
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
    const latestById = new Map(
      response.hits.hits.flatMap(({ _source }) => (_source ? [[_source.id, _source] as const] : []))
    );

    const timestamp = now().toISOString();
    const tombstones = [...latestById.values()]
      .filter(({ deleted_at: deletedAt }) => deletedAt === undefined)
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
    if (ids.length === 0) {
      return { deletedDocuments: 0 };
    }

    const { deleted = 0, failures = [] } = await esClient.deleteByQuery({
      index: SESSION_MEMORY_DATA_STREAM,
      ...ignoreMissingStream,
      query: { bool: { filter: [{ terms: { id: [...ids] } }, ...scopeFilter(scope)] } },
      conflicts: 'proceed',
    });
    if (failures.length > 0) {
      throw new Error(
        `Failed to delete from session memory: ${failures[0].cause?.reason ?? 'unknown error'}`
      );
    }
    return { deletedDocuments: deleted };
  },

  saveEvent: async ({ space, userId }, input) => {
    const { id = generateId(), sessionId, turnId, transcript, aiIndexIds = [] } = input;
    await esClient.index<StoredSessionEvent>({
      index: SESSION_EVENTS_DATA_STREAM,
      op_type: 'create',
      document: {
        '@timestamp': now().toISOString(),
        id,
        space,
        session_id: sessionId,
        ...(turnId === undefined ? {} : { turn_id: turnId }),
        user_id: userId,
        ai_index_id: [...aiIndexIds],
        transcript,
      },
    });
    return { id };
  },
});

/** Builds the session memory service on core's internal user client. */
export const getSessionMemoryService = ({
  elasticsearch,
}: Pick<CoreStart, 'elasticsearch'>): SessionMemoryService =>
  createSessionMemoryService({ esClient: elasticsearch.client.asInternalUser });
