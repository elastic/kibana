/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings, StorageDocumentOf } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import {
  CATALOG_MANIFEST_DOC_ID,
  CONNECTOR_TYPE_CATALOG_INDEX,
  getCatalogAssetDocId,
  getCatalogDefinitionDocId,
} from './constants';
import type {
  CatalogRequestOptions,
  ConnectorCatalogStorage,
  StoredCatalogDefinition,
  StoredCatalogManifest,
} from './types';

interface ManifestSource {
  type: 'manifest';
  raw: string;
}

interface DefinitionSource extends StoredCatalogDefinition {
  type: 'definition';
}

const INDEX_NOT_FOUND_ERROR_TYPE = 'index_not_found_exception';

const isResponseErrorWithStatus = (error: unknown, statusCode: number): boolean =>
  error instanceof errors.ResponseError && error.statusCode === statusCode;

// `yaml`, `raw` and `content` are stored but not indexed, so they only live in `_source`.
const catalogStorageSettings = {
  name: CONNECTOR_TYPE_CATALOG_INDEX,
  schema: {
    properties: {
      type: types.keyword({}),
      connectorId: types.keyword({}),
      version: types.keyword({}),
      contentHash: types.keyword({}),
      catalogVersion: types.keyword({}),
      sha256: types.keyword({}),
      yaml: types.text({ index: false }),
      raw: types.text({ index: false }),
      content: types.text({ index: false }),
    },
  },
} satisfies IndexStorageSettings;

export const createConnectorCatalogStorage = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): ConnectorCatalogStorage => {
  const adapter = new StorageIndexAdapter<
    typeof catalogStorageSettings,
    StorageDocumentOf<typeof catalogStorageSettings>
  >(esClient, logger, catalogStorageSettings);
  const client = adapter.getClient();

  const createOnly = async (
    id: string,
    document: StorageDocumentOf<typeof catalogStorageSettings>
  ): Promise<{ created: boolean }> => {
    try {
      await client.index({ id, document, op_type: 'create', refresh: false });
      return { created: true };
    } catch (error) {
      if (isResponseErrorWithStatus(error, 409)) {
        return { created: false };
      }
      throw error;
    }
  };

  return {
    // Reads use realtime get/mget on the alias, not the adapter `get` (a search).
    getManifest: async ({ signal }: CatalogRequestOptions = {}) => {
      try {
        const response = await esClient.get<ManifestSource>(
          { index: CONNECTOR_TYPE_CATALOG_INDEX, id: CATALOG_MANIFEST_DOC_ID },
          { signal }
        );
        const raw = response._source?.raw;
        return typeof raw === 'string' ? { raw } : undefined;
      } catch (error) {
        if (isResponseErrorWithStatus(error, 404)) {
          return undefined;
        }
        throw error;
      }
    },

    getDefinitions: async (refs, { signal }: CatalogRequestOptions = {}) => {
      if (refs.length === 0) {
        return [];
      }
      try {
        const response = await esClient.mget<DefinitionSource>(
          { index: CONNECTOR_TYPE_CATALOG_INDEX, ids: refs.map(getCatalogDefinitionDocId) },
          { signal }
        );
        return response.docs.flatMap((doc) => {
          if ('error' in doc) {
            // `_mget` answers 200 with an error on each document when the index is missing.
            if (doc.error.type === INDEX_NOT_FOUND_ERROR_TYPE) {
              return [];
            }
            throw new Error(
              `Failed to read connector catalog definition "${doc._id}": ${doc.error.type}: ${doc.error.reason}`
            );
          }
          if (!doc.found || !doc._source) {
            return [];
          }
          const { connectorId, version, yaml, contentHash, catalogVersion } = doc._source;
          return [{ connectorId, version, yaml, contentHash, catalogVersion }];
        });
      } catch (error) {
        if (isResponseErrorWithStatus(error, 404)) {
          return [];
        }
        throw error;
      }
    },

    createDefinition: (definition: StoredCatalogDefinition) =>
      createOnly(
        getCatalogDefinitionDocId({ id: definition.connectorId, version: definition.version }),
        { type: 'definition', ...definition }
      ),

    createAsset: ({ sha256, content }) =>
      createOnly(getCatalogAssetDocId(sha256), { type: 'asset', sha256, content }),

    replaceManifest: async ({ raw }: StoredCatalogManifest) => {
      await client.index({
        id: CATALOG_MANIFEST_DOC_ID,
        document: { type: 'manifest', raw },
        refresh: false,
      });
    },
  };
};
