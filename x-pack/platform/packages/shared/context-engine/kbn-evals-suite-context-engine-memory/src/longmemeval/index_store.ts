/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { INDEX_SCHEMA_VERSION, POC_INDEX } from './constants';
import type { LongMemEvalHistory, LongMemEvalHistorySession, LongMemEvalMessage } from './dataset';

/**
 * One conversation turn: a user message and the assistant replies that follow it. Turns keep
 * search results small (Agent Builder truncates tool results at 20k tokens) while the session
 * fields let the agent fetch neighbouring turns.
 */
export interface TurnDocument {
  readonly benchmark: string;
  readonly index_schema_version: string;
  readonly session_id: string;
  readonly session_order: number;
  readonly session_date: string;
  readonly session_timestamp: string;
  readonly turn_index: number;
  readonly turn_count: number;
  readonly message_count: number;
  readonly text: string;
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
    turn_index: { type: 'integer' },
    turn_count: { type: 'integer' },
    message_count: { type: 'integer' },
    text: { type: 'text' },
  },
};

/** Refuses any index other than the POC index, so no helper can touch other data. */
export const assertPocIndex = (indexName: string): void => {
  if (indexName !== POC_INDEX) {
    throw new Error(`Refusing to operate on "${indexName}"; only "${POC_INDEX}" is allowed.`);
  }
};

/** Splits a session into turns: each user message starts one; replies attach to it. */
const groupIntoTurns = (messages: LongMemEvalHistorySession['messages']): LongMemEvalMessage[][] =>
  messages.reduce<LongMemEvalMessage[][]>((turns, message) => {
    const current = turns[turns.length - 1];
    if (message.role === 'assistant' && current) {
      current.push(message);
    } else {
      turns.push([message]);
    }
    return turns;
  }, []);

export const turnDocumentId = (sessionId: string, turnIndex: number): string =>
  `${sessionId}-turn-${String(turnIndex).padStart(4, '0')}`;

export const toTurnDocuments = (session: LongMemEvalHistorySession): TurnDocument[] => {
  const turns = groupIntoTurns(session.messages);
  return turns.map((turn, turnIndex) => ({
    benchmark: 'longmemeval-s',
    index_schema_version: INDEX_SCHEMA_VERSION,
    session_id: session.sessionId,
    session_order: session.sourceIndex,
    session_date: session.occurredAtRaw,
    session_timestamp: session.occurredAt,
    turn_index: turnIndex,
    turn_count: turns.length,
    message_count: turn.length,
    text: turn.map(({ role, content }) => `${role}: ${content}`).join('\n'),
  }));
};

/** Every turn document of a history, in session and turn order. */
export const toHistoryDocuments = (history: LongMemEvalHistory): TurnDocument[] =>
  history.sessions.flatMap(toTurnDocuments);

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
 * returns turn text. Validates the index; it is never shown to the agent.
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
      query: `FROM ${POC_INDEX} METADATA _score | WHERE MATCH(text, "${term}") | SORT _score DESC | KEEP session_id, turn_index, session_date, text | LIMIT 3`,
    });
    const textColumn = response.columns.findIndex(({ name }) => name === 'text');
    const hasConversation = response.values.some(
      (row) => typeof row[textColumn] === 'string' && String(row[textColumn]).length > 0
    );
    if (!hasConversation) {
      throw new Error(`Pre-flight ES|QL query on ${POC_INDEX} returned no turn text.`);
    }
  } finally {
    await deletePocIndex(esClient);
  }
};

/**
 * Replaces the POC index with one document per conversation turn of `history`, refreshes it and
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

  const documents = toHistoryDocuments(history);
  const operations = documents.flatMap((document) => [
    { index: { _index: indexName, _id: turnDocumentId(document.session_id, document.turn_index) } },
    document,
  ]);
  const bulkResponse = await esClient.bulk({ operations, refresh: true });
  if (bulkResponse.errors) {
    const firstError = bulkResponse.items.find((item) => item.index?.error)?.index?.error;
    throw new Error(`Bulk indexing into ${indexName} failed: ${JSON.stringify(firstError)}`);
  }

  const { count } = await esClient.count({ index: indexName });
  if (count !== documents.length) {
    throw new Error(`Expected ${documents.length} documents in ${indexName}, found ${count}.`);
  }

  return { durationMs: Date.now() - startedAt, documentCount: count };
};
