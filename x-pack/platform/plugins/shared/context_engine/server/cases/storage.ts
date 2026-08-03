/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings, IStorageClient } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';

/**
 * The self-improvement "case corpus": one document per retrieval/tool event
 * extracted from agent traces by the `case_builder` task, later annotated with
 * classification labels + a pattern key by the `trace_classifier` task.
 */
export const casesIndexName = '.contextengine-cases';

const storageSettings = {
  name: casesIndexName,
  schema: {
    properties: {
      // identity (written by case_builder)
      case_id: types.keyword({}),
      ai_index_id: types.keyword({}),
      conversation_id: types.keyword({}),
      round_id: types.keyword({}),
      span_id: types.keyword({}),
      tool_call_id: types.keyword({}),
      '@timestamp': types.date({}),
      agent: types.object({
        properties: {
          name: types.keyword({}),
          id: types.keyword({}),
          class: types.keyword({}),
        },
      }),
      // the retrieval event
      tool: types.keyword({}),
      query: types.text({}),
      query_kind: types.keyword({}),
      target_index: types.keyword({}),
      returned: types.object({
        properties: {
          columns: types.keyword({}),
          row_count: types.long({}),
        },
      }),
      status: types.keyword({}),
      error: types.text({}),
      duration_ms: types.double({}),
      round_signals: types.object({
        properties: {
          esql_count: types.long({}),
          raw_query_count: types.long({}),
          ki_retrieval_count: types.long({}),
          looped: types.boolean({}),
          fell_back_to_raw: types.boolean({}),
        },
      }),
      // classification (written by trace_classifier)
      classified: types.boolean({}),
      labels: types.nested({
        properties: {
          type: types.keyword({}),
          sub_type: types.keyword({}),
          confidence: types.double({}),
        },
      }),
      pattern_key: types.keyword({}),
      partition: types.keyword({}),
      classifier_version: types.keyword({}),
    },
  },
} satisfies IndexStorageSettings;

export type CaseAgentClass = 'user' | 'management';
export type CaseQueryKind = 'ki_retrieval' | 'raw_access' | 'other';
export type CasePartition = 'dev' | 'eval' | 'regression';

export interface CaseLabel {
  type: string;
  sub_type?: string;
  confidence?: number;
}

export interface CaseDocument {
  case_id: string;
  ai_index_id: string;
  conversation_id?: string;
  round_id: string;
  span_id: string;
  tool_call_id?: string;
  '@timestamp': string;
  agent?: { name?: string; id?: string; class?: CaseAgentClass };
  tool: string;
  query?: string;
  query_kind?: CaseQueryKind;
  target_index?: string;
  returned?: { columns?: string[]; row_count?: number };
  status?: string;
  error?: string;
  duration_ms?: number;
  round_signals?: {
    esql_count?: number;
    raw_query_count?: number;
    ki_retrieval_count?: number;
    looped?: boolean;
    fell_back_to_raw?: boolean;
  };
  classified?: boolean;
  labels?: CaseLabel[];
  pattern_key?: string;
  partition?: CasePartition;
  classifier_version?: string;
}

export type CasesStorageSettings = typeof storageSettings;

export type CasesStorageClient = IStorageClient<CasesStorageSettings, CaseDocument>;

export const createCasesStorageClient = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): CasesStorageClient => {
  const adapter = new StorageIndexAdapter<CasesStorageSettings, CaseDocument>(
    esClient,
    logger,
    storageSettings
  );
  return adapter.getClient();
};
