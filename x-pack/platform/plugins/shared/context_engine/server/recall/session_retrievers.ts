/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  RetrieverContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  RecallEventRole,
  SessionEventRecallResult,
  SessionMemoryRecallResult,
} from '../../common/http_api/recall';
import { SESSION_EVENTS_DATA_STREAM } from '../session_events/data_streams';
import { SESSION_MEMORY_DATA_STREAM } from '../session_memory/data_streams';

export interface SessionRecallParams {
  readonly esClient: ElasticsearchClient;
  readonly space: string;
  readonly userId: string;
  readonly query: string;
  readonly sessionIds?: readonly string[];
  readonly size: number;
}

interface SessionEventHitSource {
  readonly id?: string;
  readonly session_id?: string;
  readonly type?: string;
  readonly event_at?: string;
  readonly '@timestamp'?: string;
  readonly content?: string;
}

interface SessionMemoryHitSource {
  readonly id?: string;
  readonly session_id?: string;
  readonly '@timestamp'?: string;
  readonly content?: string;
  readonly attributes?: Record<string, string>;
  readonly deleted_at?: string;
}

interface LatestMemoryRevision {
  readonly docId: string;
  readonly source: SessionMemoryHitSource;
}

const CANDIDATE_OVERFETCH_FACTOR = 2;
const MAX_MEMORY_RECALL_ROUNDS = 3;

const RECALLED_EVENT_ROLES: readonly RecallEventRole[] = ['user', 'assistant'];

const isRecallEventRole = (type: string | undefined): type is RecallEventRole =>
  RECALLED_EVENT_ROLES.some((role) => role === type);

const assertScope = (space: string, userId: string): void => {
  if (space.trim() === '') {
    throw new Error('Session recall scope requires a non-empty space');
  }
  if (userId.trim() === '') {
    throw new Error('Session recall scope requires a non-empty userId');
  }
};

const buildSessionFilters = ({
  space,
  userId,
  sessionIds = [],
  extraFilters = [],
}: {
  space: string;
  userId: string;
  sessionIds?: readonly string[];
  extraFilters?: readonly QueryDslQueryContainer[];
}): QueryDslQueryContainer[] => {
  const uniqueSessionIds = [...new Set(sessionIds)];
  return [
    { term: { space } },
    { term: { user_id: userId } },
    ...(uniqueSessionIds.length > 0 ? [{ terms: { session_id: uniqueSessionIds } }] : []),
    ...extraFilters,
  ];
};

const buildHybridRetriever = (
  query: string,
  filters: QueryDslQueryContainer[],
  rankWindowSize: number,
  mustNot: QueryDslQueryContainer[] = []
): RetrieverContainer => ({
  rrf: {
    retrievers: [
      { standard: { query: { match: { content: query } } } },
      { standard: { query: { match: { 'content.semantic_text': query } } } },
    ],
    filter: {
      bool: {
        filter: filters,
        ...(mustNot.length > 0 ? { must_not: mustNot } : {}),
      },
    },
    rank_window_size: rankWindowSize,
  },
});

/**
 * Returns the user and assistant messages that best match the query, in hybrid rank order.
 */
export const retrieveSessionEvents = async ({
  esClient,
  space,
  userId,
  query,
  sessionIds,
  size,
}: SessionRecallParams): Promise<SessionEventRecallResult[]> => {
  assertScope(space, userId);
  if (size <= 0) {
    return [];
  }

  const fetchSize = size * CANDIDATE_OVERFETCH_FACTOR;
  const filters = buildSessionFilters({
    space,
    userId,
    sessionIds,
    extraFilters: [{ terms: { type: [...RECALLED_EVENT_ROLES] } }],
  });
  const response = await esClient.search<SessionEventHitSource>({
    index: SESSION_EVENTS_DATA_STREAM,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: fetchSize,
    _source: ['id', 'session_id', 'type', 'event_at', '@timestamp', 'content'],
    retriever: buildHybridRetriever(query, filters, fetchSize),
  });

  const results: SessionEventRecallResult[] = [];
  const seenIdsBySession = new Map<string, Set<string>>();
  for (const { _source: source } of response.hits.hits) {
    if (results.length === size) {
      break;
    }
    if (!source) {
      continue;
    }
    const { id, session_id: sessionId, type, content } = source;
    const date = source.event_at ?? source['@timestamp'];
    if (!id || !sessionId || !content || !date || !isRecallEventRole(type)) {
      continue;
    }
    const seenIds = seenIdsBySession.get(sessionId) ?? new Set<string>();
    if (seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);
    seenIdsBySession.set(sessionId, seenIds);
    results.push({
      id,
      session_id: sessionId,
      source: 'session_events',
      date,
      role: type,
      content,
    });
  }
  return results;
};

const collapseLatestMemoryRevisions = async ({
  esClient,
  space,
  userId,
  ids,
}: {
  esClient: ElasticsearchClient;
  space: string;
  userId: string;
  ids: readonly string[];
}): Promise<Map<string, LatestMemoryRevision>> => {
  const response = await esClient.search<SessionMemoryHitSource>({
    index: SESSION_MEMORY_DATA_STREAM,
    ignore_unavailable: true,
    allow_no_indices: true,
    allow_partial_search_results: false,
    size: ids.length,
    _source: ['id', 'session_id', '@timestamp', 'content', 'attributes', 'deleted_at'],
    query: {
      bool: {
        filter: [{ terms: { id: [...ids] } }, { term: { space } }, { term: { user_id: userId } }],
      },
    },
    collapse: { field: 'id' },
    sort: [{ '@timestamp': 'desc' }, { deleted_at: { order: 'desc', missing: '_last' } }],
  });
  return new Map(
    response.hits.hits.flatMap(({ _id: docId, _source: source }) =>
      docId && source?.id ? [[source.id, { docId, source }] as const] : []
    )
  );
};

/**
 * Returns the live memories whose latest revision matches the query, in hybrid rank order.
 */
export const retrieveSessionMemories = async ({
  esClient,
  space,
  userId,
  query,
  sessionIds,
  size,
}: SessionRecallParams): Promise<SessionMemoryRecallResult[]> => {
  assertScope(space, userId);
  if (size <= 0) {
    return [];
  }

  const fetchSize = size * CANDIDATE_OVERFETCH_FACTOR;
  const baseFilters = buildSessionFilters({ space, userId, sessionIds });
  const allowedSessionIds = sessionIds && sessionIds.length > 0 ? new Set(sessionIds) : undefined;
  const latestById = new Map<string, LatestMemoryRevision | undefined>();
  const excludedMemoryIds = new Set<string>();
  const excludedDocIds = new Set<string>();
  const results: SessionMemoryRecallResult[] = [];

  for (let round = 0; round < MAX_MEMORY_RECALL_ROUNDS && results.length < size; round++) {
    const mustNot: QueryDslQueryContainer[] = [
      ...(excludedMemoryIds.size > 0 ? [{ terms: { id: [...excludedMemoryIds] } }] : []),
      ...(excludedDocIds.size > 0 ? [{ ids: { values: [...excludedDocIds] } }] : []),
    ];
    const response = await esClient.search<SessionMemoryHitSource>({
      index: SESSION_MEMORY_DATA_STREAM,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: fetchSize,
      _source: ['id'],
      retriever: buildHybridRetriever(query, baseFilters, fetchSize, mustNot),
    });

    const { hits } = response.hits;
    const candidates = hits.flatMap(({ _id: docId, _source: source }) =>
      docId && source?.id ? [{ docId, id: source.id }] : []
    );
    if (candidates.length === 0) {
      break;
    }

    const unseenIds = [...new Set(candidates.map(({ id }) => id))].filter(
      (id) => !latestById.has(id)
    );
    if (unseenIds.length > 0) {
      const fetched = await collapseLatestMemoryRevisions({
        esClient,
        space,
        userId,
        ids: unseenIds,
      });
      for (const id of unseenIds) {
        latestById.set(id, fetched.get(id));
      }
    }

    const prevExclusions = excludedMemoryIds.size + excludedDocIds.size;
    for (const { docId, id } of candidates) {
      if (results.length === size) {
        break;
      }
      if (excludedMemoryIds.has(id)) {
        continue;
      }
      const latest = latestById.get(id);
      if (!latest || latest.source.deleted_at !== undefined) {
        excludedMemoryIds.add(id);
        continue;
      }
      const { session_id: sessionId, '@timestamp': date, content, attributes } = latest.source;
      if (
        !sessionId ||
        !date ||
        !content ||
        (allowedSessionIds && !allowedSessionIds.has(sessionId))
      ) {
        excludedMemoryIds.add(id);
        continue;
      }
      if (latest.docId !== docId) {
        excludedDocIds.add(docId);
        continue;
      }
      excludedMemoryIds.add(id);
      results.push({
        id,
        session_id: sessionId,
        source: 'session_memory',
        date,
        content,
        ...(attributes && Object.keys(attributes).length > 0 ? { attributes } : {}),
      });
    }

    if (
      hits.length < fetchSize ||
      excludedMemoryIds.size + excludedDocIds.size === prevExclusions
    ) {
      break;
    }
  }

  return results;
};
