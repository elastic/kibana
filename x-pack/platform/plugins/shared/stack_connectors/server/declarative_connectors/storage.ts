/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  StorageIndexAdapter,
  type IStorageClient,
  type IndexStorageSettings,
  types,
} from '@kbn/storage-adapter';
import type { StoredDeclarativeCatalog } from './types';

export const DECLARATIVE_CONNECTOR_CATALOG_INDEX = '.workflows-connectors';
export const DECLARATIVE_CONNECTOR_CATALOG_DOCUMENT_ID = 'active';

const storageSettings = {
  name: DECLARATIVE_CONNECTOR_CATALOG_INDEX,
  schema: {
    properties: {
      catalog: types.object({ enabled: false }),
      updated_at: types.date(),
    },
  },
} satisfies IndexStorageSettings;

interface DeclarativeConnectorCatalogDocument {
  catalog: StoredDeclarativeCatalog;
  updated_at: string;
}

type DeclarativeConnectorCatalogStorageSettings = typeof storageSettings;

export type DeclarativeConnectorCatalogStorage = IStorageClient<
  DeclarativeConnectorCatalogStorageSettings,
  DeclarativeConnectorCatalogDocument
>;

export const createDeclarativeConnectorCatalogStorage = (
  esClient: ElasticsearchClient,
  logger: Logger
): DeclarativeConnectorCatalogStorage => {
  const adapter = new StorageIndexAdapter<
    DeclarativeConnectorCatalogStorageSettings,
    DeclarativeConnectorCatalogDocument
  >(esClient, logger, storageSettings);
  return adapter.getClient();
};
