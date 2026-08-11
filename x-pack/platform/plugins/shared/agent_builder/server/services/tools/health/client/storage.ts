/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import type { ToolHealthStatus } from '../../../../../common/http_api/tools';

export const toolHealthIndexName = chatSystemIndex('tool-health');

// Re-export from common for convenience
export type { ToolHealthStatus };

const storageSettings = {
  name: toolHealthIndexName,
  schema: {
    properties: {
      tool_id: types.keyword({}),
      space: types.keyword({}),
      status: types.keyword({}),
      last_check: types.date({}),
      error_message: types.text({}),
      consecutive_failures: types.long({}),
      updated_at: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export interface ToolHealthProperties {
  tool_id: string;
  space: string;
  status: ToolHealthStatus;
  last_check: string;
  error_message?: string;
  consecutive_failures: number;
  updated_at: string;
}

export type ToolHealthStorageSettings = typeof storageSettings;

export type ToolHealthStorage = StorageIndexAdapter<
  ToolHealthStorageSettings,
  ToolHealthProperties
>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): ToolHealthStorage => {
  return new StorageIndexAdapter<ToolHealthStorageSettings, ToolHealthProperties>(
    esClient,
    logger,
    storageSettings
  );
};
