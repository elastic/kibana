/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { ToolDescriptorMeta } from '@kbn/onechat-common';
import { IndexStorageSettings, StorageIndexAdapter, types } from '@kbn/storage-adapter';

export const esqlToolIndexName = '.kibana_onechat_esql_tools';

const storageSettings = {
  name: esqlToolIndexName,
  schema: {
    properties: {
      id: types.keyword({}),
      name: types.keyword({}),
      description: types.text({}),
      query: types.text({}),
      params: types.object({
        dynamic: true,
        properties: {},
      }),
      meta: types.object({
        properties: {
          providerId: types.keyword({}),
          tags: types.keyword({}),
        },
      }),
      created_at: types.date({}),
      updated_at: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export interface EsqlToolProperties {
  id: string;
  name: string;
  description: string;
  query: string;
  params: Record<
    string,
    {
      type: string;
      description: string;
    }
  >;
  meta: ToolDescriptorMeta;
}

export type EsqlToolStorageSettings = typeof storageSettings;

export type EsqlToolStorage = StorageIndexAdapter<EsqlToolStorageSettings, EsqlToolProperties>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): EsqlToolStorage => {
  return new StorageIndexAdapter<EsqlToolStorageSettings, EsqlToolProperties>(
    esClient,
    logger,
    storageSettings
  );
};
