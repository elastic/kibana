/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { ES_AI_INDEX_PATH, MAX_AI_INDICES } from '../../common/constants';
import type {
  AiIndexAutomation,
  AiIndexDest,
  AiIndexFeedbackAnalysis,
  AiIndexSource,
  AiIndexTrace,
} from '../../common/http_api/ai_indices';

/**
 * An AI index registry record as the Elasticsearch `_context_engine/ai_index` API returns it.
 * Records are keyed `<space>:<id>` server-side, so every record carries both.
 */
export interface AiIndexRecord {
  id: string;
  space: string;
  description?: string;
  /** Absent reads as unmanaged (`false`). */
  managed?: boolean;
  /** Absent reads as enabled for user-owned entries and disabled for managed ones. */
  memory_enabled?: boolean;
  date_created: string;
  date_modified: string;
  dest: AiIndexDest;
  automations: AiIndexAutomation[];
  sources: AiIndexSource[];
  /** Absent reads as `[]`. */
  traces?: AiIndexTrace[];
  feedback_analysis?: AiIndexFeedbackAnalysis;
}

/** What a write sends: the server owns the id (from the path) and both dates. */
export type AiIndexRecordWrite = Omit<AiIndexRecord, 'id' | 'date_created' | 'date_modified'>;

export interface PutAiIndexRecordResponse {
  result: 'created' | 'updated';
  ai_index: AiIndexRecord;
}

interface ListAiIndexRecordsResponse {
  count: number;
  results: AiIndexRecord[];
}

const recordPath = (id: string): string => `${ES_AI_INDEX_PATH}/${encodeURIComponent(id)}`;

/**
 * Creates or replaces a record. With `create`, an existing record is a 409 the caller maps; a
 * replace keeps the server-side `date_created`.
 */
export const putAiIndexRecord = (
  esClient: ElasticsearchClient,
  { id, record, create = false }: { id: string; record: AiIndexRecordWrite; create?: boolean }
): Promise<PutAiIndexRecordResponse> =>
  esClient.transport.request<PutAiIndexRecordResponse>({
    method: 'PUT',
    path: recordPath(id),
    ...(create ? { querystring: { create: true } } : {}),
    body: record,
  });

/** The record for an id in a space, or `undefined` when there is none. */
export const getAiIndexRecord = async (
  esClient: ElasticsearchClient,
  { id, space }: { id: string; space: string }
): Promise<AiIndexRecord | undefined> => {
  try {
    return await esClient.transport.request<AiIndexRecord>({
      method: 'GET',
      path: recordPath(id),
      querystring: { space },
    });
  } catch (error) {
    if (isResponseError(error) && error.statusCode === 404) {
      return undefined;
    }
    throw error;
  }
};

/**
 * Records sorted by id. Without `space` the list spans every space (telemetry, shared-dest
 * checks); `dest` filters on the backing store name.
 */
export const listAiIndexRecords = async (
  esClient: ElasticsearchClient,
  { space, dest, size = MAX_AI_INDICES }: { space?: string; dest?: string; size?: number } = {}
): Promise<AiIndexRecord[]> => {
  const { results } = await esClient.transport.request<ListAiIndexRecordsResponse>({
    method: 'GET',
    path: ES_AI_INDEX_PATH,
    querystring: {
      ...(space !== undefined ? { space } : {}),
      ...(dest !== undefined ? { dest } : {}),
      size,
    },
  });
  return results;
};

/** Deletes a record; resolves `false` when there was none. */
export const deleteAiIndexRecord = async (
  esClient: ElasticsearchClient,
  { id, space }: { id: string; space: string }
): Promise<boolean> => {
  try {
    await esClient.transport.request({
      method: 'DELETE',
      path: recordPath(id),
      querystring: { space },
    });
    return true;
  } catch (error) {
    if (isResponseError(error) && error.statusCode === 404) {
      return false;
    }
    throw error;
  }
};
