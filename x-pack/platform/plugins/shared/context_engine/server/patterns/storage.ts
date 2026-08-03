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
 * A failure pattern: a living cluster of comparable cases keyed by failure mode.
 * The aggregation unit of the self-improvement loop and the record rendered as
 * an actionable item in the "Patterns & improvements" panel.
 */
export const patternsIndexName = '.contextengine-patterns';

const storageSettings = {
  name: patternsIndexName,
  schema: {
    properties: {
      pattern_key: types.keyword({}),
      type: types.keyword({}),
      sub_type: types.keyword({}),
      ai_index_id: types.keyword({}),
      status: types.keyword({}),
      // Human-readable description of what the classifier spotted (see describePattern).
      summary: types.text({}),
      evidence: types.object({
        properties: {
          case_count: types.long({}),
          first_seen: types.date({}),
          last_seen: types.date({}),
          frequency: types.double({}),
          impact: types.keyword({}),
          confidence: types.double({}),
          affected_versions: types.keyword({}),
          representative_case_ids: types.keyword({}),
        },
      }),
      partitions: types.object({
        properties: {
          dev_count: types.long({}),
          eval_count: types.long({}),
          regression_count: types.long({}),
        },
      }),
    },
  },
} satisfies IndexStorageSettings;

export type PatternStatus = 'open' | 'improving' | 'resolved';

export interface PatternDocument {
  pattern_key: string;
  type: string;
  sub_type?: string;
  ai_index_id: string;
  status: PatternStatus;
  /** One- or two-sentence summary of the failure the classifier detected. */
  summary?: string;
  evidence?: {
    case_count?: number;
    first_seen?: string;
    last_seen?: string;
    frequency?: number;
    impact?: string;
    confidence?: number;
    affected_versions?: string[];
    representative_case_ids?: string[];
  };
  partitions?: {
    dev_count?: number;
    eval_count?: number;
    regression_count?: number;
  };
}

export type PatternsStorageSettings = typeof storageSettings;

export type PatternsStorageClient = IStorageClient<PatternsStorageSettings, PatternDocument>;

export const createPatternsStorageClient = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): PatternsStorageClient => {
  const adapter = new StorageIndexAdapter<PatternsStorageSettings, PatternDocument>(
    esClient,
    logger,
    storageSettings
  );
  return adapter.getClient();
};
