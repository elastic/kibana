/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  CATALOG_MANIFEST_DOC_ID,
  CONNECTOR_CATALOG_INDEX,
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

const isResponseErrorWithStatus = (error: unknown, statusCode: number): boolean =>
  error instanceof errors.ResponseError && error.statusCode === statusCode;

const isIndexAlreadyExists = (error: unknown): boolean =>
  error instanceof errors.ResponseError &&
  error.body?.error?.type === 'resource_already_exists_exception';

// `yaml`, `raw` and `content` stay in `_source` only. `dynamic: false` keeps them unindexed.
const CATALOG_MAPPINGS = {
  dynamic: false,
  properties: {
    type: { type: 'keyword' },
    connectorId: { type: 'keyword' },
    version: { type: 'keyword' },
    contentHash: { type: 'keyword' },
    catalogVersion: { type: 'keyword' },
    sha256: { type: 'keyword' },
  },
} as const;

export const createConnectorCatalogStorage = ({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): ConnectorCatalogStorage => {
  const createOnly = async (id: string, document: object): Promise<{ created: boolean }> => {
    try {
      await esClient.index({ index: CONNECTOR_CATALOG_INDEX, id, document, op_type: 'create' });
      return { created: true };
    } catch (error) {
      if (isResponseErrorWithStatus(error, 409)) {
        return { created: false };
      }
      throw error;
    }
  };

  return {
    ensureIndex: async ({ signal }: CatalogRequestOptions = {}) => {
      try {
        await esClient.indices.create(
          { index: CONNECTOR_CATALOG_INDEX, mappings: CATALOG_MAPPINGS },
          { signal }
        );
      } catch (error) {
        // Another Kibana node may have created the index first.
        if (!isIndexAlreadyExists(error)) {
          throw error;
        }
      }
    },

    getManifest: async ({ signal }: CatalogRequestOptions = {}) => {
      try {
        const response = await esClient.get<ManifestSource>(
          { index: CONNECTOR_CATALOG_INDEX, id: CATALOG_MANIFEST_DOC_ID },
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
          { index: CONNECTOR_CATALOG_INDEX, ids: refs.map(getCatalogDefinitionDocId) },
          { signal }
        );
        return response.docs.flatMap((doc) => {
          if (!('found' in doc) || !doc.found || !doc._source) {
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
      await esClient.index({
        index: CONNECTOR_CATALOG_INDEX,
        id: CATALOG_MANIFEST_DOC_ID,
        document: { type: 'manifest', raw },
      });
    },
  };
};
