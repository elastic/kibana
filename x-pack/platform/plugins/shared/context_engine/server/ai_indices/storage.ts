/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings, IStorageClient } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type {
  AiIndexAutomation,
  AiIndexDest,
  AiIndexSource,
} from '../../common/http_api/ai_indices';

export const aiIndicesIndexName = '.contextengine-ai-indices';

const storageSettings = {
  name: aiIndicesIndexName,
  schema: {
    properties: {
      name: types.keyword({}),
      description: types.text({}),
      date_created: types.date({}),
      date_modified: types.date({}),
      dest: types.object({
        properties: { type: types.keyword({}), value: types.keyword({}) },
      }),
      automations: types.object({
        properties: { type: types.keyword({}), value: types.keyword({}) },
      }),
      sources: types.object({
        properties: { type: types.keyword({}), value: types.keyword({}) },
      }),
    },
  },
} satisfies IndexStorageSettings;

export interface AiIndexDocument {
  name: string;
  description?: string;
  date_created: string;
  date_modified: string;
  dest: AiIndexDest;
  automations: AiIndexAutomation[];
  sources: AiIndexSource[];
}

export type AiIndexStorageSettings = typeof storageSettings;

export type AiIndexStorageClient = IStorageClient<AiIndexStorageSettings, AiIndexDocument>;

export const createAiIndexStorageClient = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): AiIndexStorageClient => {
  const adapter = new StorageIndexAdapter<AiIndexStorageSettings, AiIndexDocument>(
    esClient,
    logger,
    storageSettings
  );
  return adapter.getClient();
};
