/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { ToolType } from '@kbn/onechat-common';
import { IndexStorageSettings, StorageIndexAdapter, types } from '@kbn/storage-adapter';

export const toolIndexName = '.kibana_onechat_tools';

const storageSettings = {
  name: toolIndexName,
  schema: {
    properties: {
      id: types.keyword({}),
      type: types.keyword({}),
      description: types.text({}),
      configuration: types.object({
        dynamic: false,
        properties: {},
      }),
      tags: types.keyword({}),
      created_at: types.date({}),
      updated_at: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export interface ToolProperties<TConfig extends object = Record<string, unknown>> {
  id: string;
  type: ToolType;
  description: string;
  configuration: TConfig;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type ToolStorageSettings = typeof storageSettings;

// @ts-expect-error type mismatch for tags type
export type ToolStorage = StorageIndexAdapter<ToolStorageSettings, ToolProperties>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): ToolStorage => {
  // @ts-expect-error type mismatch for tags type
  return new StorageIndexAdapter<ToolStorageSettings, ToolProperties>(
    esClient,
    logger,
    storageSettings
  );
};
