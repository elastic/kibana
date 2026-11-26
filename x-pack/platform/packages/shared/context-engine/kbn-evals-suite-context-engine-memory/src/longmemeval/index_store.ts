/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { INDEX_SCHEMA_VERSION, POC_INDEX } from './constants';
import type { LongMemEvalHistory, LongMemEvalHistorySession } from './dataset';

export interface SessionDocument {
  readonly benchmark: string;
  readonly index_schema_version: string;
  readonly session_id: string;
  readonly session_order: number;
  readonly session_date: string;
  readonly session_timestamp: string;
  readonly message_count: number;
  readonly conversation: string;
}

export const POC_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    benchmark: { type: 'keyword' },
    index_schema_version: { type: 'keyword' },
    session_id: { type: 'keyword' },
    session_order: { type: 'integer' },
    session_date: { type: 'keyword' },
    session_timestamp: { type: 'date' },
    message_count: { type: 'integer' },
    conversation: { type: 'text' },
  },
};

/** Refuses any index other than the POC index, so no helper can touch other data. */
export const assertPocIndex = (indexName: string): void => {
  if (indexName !== POC_INDEX) {
    throw new Error(`Refusing to operate on "${indexName}"; only "${POC_INDEX}" is allowed.`);
  }
};

export const toSessionDocument = (session: LongMemEvalHistorySession): SessionDocument => ({
  benchmark: 'longmemeval-s',
  index_schema_version: INDEX_SCHEMA_VERSION,
  session_id: session.sessionId,
  session_order: session.sourceIndex,
  session_date: session.occurredAtRaw,
  session_timestamp: session.occurredAt,
  message_count: session.messages.length,
  conversation: session.messages.map(({ role, content }) => `${role}: ${content}`).join('\n'),
});

export const deletePocIndex = async (
  esClient: Client,
  indexName: string = POC_INDEX
): Promise<void> => {
  assertPocIndex(indexName);
  await esClient.indices.delete({ index: indexName, ignore_unavailable: true });
};

export const isPocIndexPresent = async (
  esClient: Client,
  indexName: string = POC_INDEX
): Promise<boolean> => {
  assertPocIndex(indexName);
  return esClient.indices.exists({ index: indexName });
};

/**
 * Pre-flight check, run once before the agent: a full-text ES|QL query over the POC index
 * returns conversation text. Validates the index; it is never shown to the agent.
 */
export const assertPocIndexSearchable = async (
  esClient: Client,
  history: LongMemEvalHistory
): Promise<void> => {
  const term = history.sessions[0]?.messages[0]?.content
    .split(/\W+/)
    .find((word) => word.length > 4);
  if (!term) {
    throw new Error('Cannot pick a search term for the POC index pre-flight check.');
  }
  await loadHistoryIntoPocIndex(esClient, history);
  try {
    const response = await esClient.esql.query({
      query: `FROM ${POC_INDEX} METADATA _score | WHERE MATCH(conversation, "${term}") | SORT _score DESC | KEEP session_id, session_date, conversation | LIMIT 3`,
    });
    const conversationColumn = response.columns.findIndex(({ name }) => name === 'conversation');
    const hasConversation = response.values.some(
      (row) =>
        typeof row[conversationColumn] === 'string' && String(row[conversationColumn]).length > 0
    );
    if (!hasConversation) {
      throw new Error(`Pre-flight ES|QL query on ${POC_INDEX} returned no conversation text.`);
    }
  } finally {
    await deletePocIndex(esClient);
  }
};

/**
 * Replaces the POC index with one document per session of `history`, refreshes it and
 * verifies the document count. Returns the load duration.
 */
export const loadHistoryIntoPocIndex = async (
  esClient: Client,
  history: LongMemEvalHistory,
  indexName: string = POC_INDEX
): Promise<{ durationMs: number; documentCount: number }> => {
  assertPocIndex(indexName);
  const startedAt = Date.now();

  await deletePocIndex(esClient, indexName);
  await esClient.indices.create({
    index: indexName,
    // Leave replicas at the default: serverless serves searches from replicas, so 0 means no
    // searchable shard. One primary keeps BM25 statistics in a single shard.
    settings: { number_of_shards: 1 },
    mappings: POC_INDEX_MAPPINGS,
  });

  const operations = history.sessions.flatMap((session) => {
    const document = toSessionDocument(session);
    return [{ index: { _index: indexName, _id: document.session_id } }, document];
  });
  const bulkResponse = await esClient.bulk({ operations, refresh: true });
  if (bulkResponse.errors) {
    const firstError = bulkResponse.items.find((item) => item.index?.error)?.index?.error;
    throw new Error(`Bulk indexing into ${indexName} failed: ${JSON.stringify(firstError)}`);
  }

  const { count } = await esClient.count({ index: indexName });
  if (count !== history.sessions.length) {
    throw new Error(
      `Expected ${history.sessions.length} documents in ${indexName}, found ${count}.`
    );
  }

  return { durationMs: Date.now() - startedAt, documentCount: count };
};
