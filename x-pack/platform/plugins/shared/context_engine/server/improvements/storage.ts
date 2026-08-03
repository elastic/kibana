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
 * An improvement: a fix targeting a pattern (1-to-many). Records the action the
 * management agent took and the measured before/after outcome.
 */
export const improvementsIndexName = '.contextengine-improvements';

const storageSettings = {
  name: improvementsIndexName,
  schema: {
    properties: {
      improvement_id: types.keyword({}),
      pattern_key: types.keyword({}),
      ai_index_id: types.keyword({}),
      status: types.keyword({}),
      action: types.keyword({}),
      target: types.keyword({}),
      change_summary: types.text({}),
      proposed_at: types.date({}),
      applied_at: types.date({}),
      measurement: types.object({
        properties: {
          baseline_results: types.flattened({}),
          candidate_results: types.flattened({}),
          verdict: types.keyword({}),
        },
      }),
    },
  },
} satisfies IndexStorageSettings;

export type ImprovementStatus =
  | 'proposed'
  | 'applied'
  | 'validated'
  | 'regressed'
  | 'rejected';

export type ImprovementAction =
  | 'update_automation'
  | 'create_ki_template'
  | 'update_source'
  | 'update_skill';

export type ImprovementVerdict = 'improved' | 'no_change' | 'regressed';

export interface ImprovementDocument {
  improvement_id: string;
  pattern_key: string;
  ai_index_id: string;
  status: ImprovementStatus;
  action?: ImprovementAction;
  target?: string;
  change_summary?: string;
  proposed_at?: string;
  applied_at?: string;
  measurement?: {
    baseline_results?: Record<string, unknown>;
    candidate_results?: Record<string, unknown>;
    verdict?: ImprovementVerdict;
  };
}

export type ImprovementsStorageSettings = typeof storageSettings;

export type ImprovementsStorageClient = IStorageClient<
  ImprovementsStorageSettings,
  ImprovementDocument
>;

export const createImprovementsStorageClient = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): ImprovementsStorageClient => {
  const adapter = new StorageIndexAdapter<ImprovementsStorageSettings, ImprovementDocument>(
    esClient,
    logger,
    storageSettings
  );
  return adapter.getClient();
};
