/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isNotFoundError, isResponseError } from '@kbn/es-errors';
import {
  StorageIndexAdapter,
  types,
  type IndexStorageSettings,
  type InternalIStorageClient,
} from '@kbn/storage-adapter';
import type { StoredAsset, StoredDefinition, StoredManifest } from './types';

export const CONNECTOR_CATALOG_INDEX_NAME = '.kibana_connector_catalog';
export const MANIFEST_DOC_ID = 'manifest';

export const definitionDocId = (id: string, version: string): string =>
  `definition:${id}@${version}`;

export const assetDocId = (contentHash: string): string => {
  const digest = contentHash.startsWith('sha256:')
    ? contentHash.slice('sha256:'.length)
    : contentHash;
  return `asset:${digest}`;
};

export const connectorCatalogStorageSettings = {
  name: CONNECTOR_CATALOG_INDEX_NAME,
  schema: {
    properties: {
      docType: types.keyword(),
      id: types.keyword(),
      version: types.keyword(),
      yaml: types.text({ index: false }),
      contentHash: types.keyword(),
      catalogVersion: types.keyword(),
      addedAt: types.date(),
      sequence: types.long(),
      bytes: types.text({ index: false }),
      signature: types.text({ index: false }),
      fetchedAt: types.date(),
      svg: types.text({ index: false }),
    },
  },
} satisfies IndexStorageSettings;

export interface ConnectorCatalogStorageDocument {
  _id?: string;
  docType?: 'manifest' | 'definition' | 'asset';
  id?: string;
  version?: string;
  yaml?: string;
  contentHash?: string;
  catalogVersion?: string;
  addedAt?: string;
  sequence?: number;
  bytes?: string;
  signature?: string;
  fetchedAt?: string;
  svg?: string;
}

export type ConnectorCatalogStorageClient = Pick<
  InternalIStorageClient<ConnectorCatalogStorageDocument>,
  'index' | 'search'
>;

const toStoredDefinition = (
  source: ConnectorCatalogStorageDocument | undefined
): StoredDefinition | undefined => {
  if (
    source?.id === undefined ||
    source.version === undefined ||
    source.yaml === undefined ||
    source.contentHash === undefined ||
    source.catalogVersion === undefined ||
    source.addedAt === undefined
  ) {
    return undefined;
  }
  return {
    id: source.id,
    version: source.version,
    yaml: source.yaml,
    contentHash: source.contentHash,
    catalogVersion: source.catalogVersion,
    addedAt: source.addedAt,
  };
};

const toStoredAsset = (
  source: ConnectorCatalogStorageDocument | undefined
): StoredAsset | undefined => {
  if (
    source?.contentHash === undefined ||
    source.svg === undefined ||
    source.addedAt === undefined
  ) {
    return undefined;
  }
  return {
    contentHash: source.contentHash,
    svg: source.svg,
    addedAt: source.addedAt,
  };
};

const isConflict = (error: unknown): boolean => isResponseError(error) && error.statusCode === 409;

export class ConnectorCatalogStorage {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly client: ConnectorCatalogStorageClient,
    private readonly logger: Logger,
    private readonly indexName: string = CONNECTOR_CATALOG_INDEX_NAME
  ) {}

  public async getManifest(): Promise<StoredManifest | undefined> {
    try {
      const response = await this.esClient.get<ConnectorCatalogStorageDocument>({
        index: this.indexName,
        id: MANIFEST_DOC_ID,
      });
      const source = response._source;
      if (
        source?.bytes === undefined ||
        source.signature === undefined ||
        source.sequence === undefined ||
        source.catalogVersion === undefined ||
        source.fetchedAt === undefined
      ) {
        return undefined;
      }
      return {
        bytes: source.bytes,
        signature: source.signature,
        sequence: source.sequence,
        catalogVersion: source.catalogVersion,
        fetchedAt: source.fetchedAt,
        seqNo: response._seq_no,
        primaryTerm: response._primary_term,
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  public async putManifest(
    manifest: StoredManifest,
    previousSequence: number | undefined
  ): Promise<'replaced' | 'stale'> {
    if (previousSequence !== undefined && manifest.sequence <= previousSequence) {
      return 'stale';
    }
    try {
      await this.client.index({
        id: MANIFEST_DOC_ID,
        ...(manifest.seqNo !== undefined && manifest.primaryTerm !== undefined
          ? { if_seq_no: manifest.seqNo, if_primary_term: manifest.primaryTerm }
          : {}),
        document: {
          docType: 'manifest',
          bytes: manifest.bytes,
          signature: manifest.signature,
          sequence: manifest.sequence,
          catalogVersion: manifest.catalogVersion,
          fetchedAt: manifest.fetchedAt,
        },
      });
      return 'replaced';
    } catch (error) {
      if (isConflict(error)) {
        return 'stale';
      }
      throw error;
    }
  }

  public async listDefinitions(): Promise<
    Array<{ id: string; version: string; contentHash: string }>
  > {
    const response = await this.client.search({
      size: 10000,
      track_total_hits: false,
      _source: ['id', 'version', 'contentHash'],
      query: { term: { docType: 'definition' } },
    });
    const rows: Array<{ id: string; version: string; contentHash: string }> = [];
    for (const hit of response.hits.hits) {
      const source = hit._source;
      if (
        source?.id !== undefined &&
        source.version !== undefined &&
        source.contentHash !== undefined
      ) {
        rows.push({ id: source.id, version: source.version, contentHash: source.contentHash });
      }
    }
    return rows;
  }

  public async getDefinition(id: string, version: string): Promise<StoredDefinition | undefined> {
    try {
      const response = await this.esClient.get<ConnectorCatalogStorageDocument>({
        index: this.indexName,
        id: definitionDocId(id, version),
      });
      return toStoredDefinition(response._source);
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  public async getDefinitions(
    keys: Array<{ id: string; version: string }>
  ): Promise<Map<string, StoredDefinition>> {
    const definitions = new Map<string, StoredDefinition>();
    if (keys.length === 0) {
      return definitions;
    }
    const response = await this.esClient.mget<ConnectorCatalogStorageDocument>({
      index: this.indexName,
      ids: keys.map(({ id, version }) => definitionDocId(id, version)),
    });
    for (const doc of response.docs) {
      if (!('found' in doc) || !doc.found) {
        continue;
      }
      const definition = toStoredDefinition(doc._source);
      if (definition) {
        definitions.set(definitionDocId(definition.id, definition.version), definition);
      }
    }
    return definitions;
  }

  public async existsDefinitions(
    keys: Array<{ id: string; version: string }>
  ): Promise<Set<string>> {
    const existing = new Set<string>();
    if (keys.length === 0) {
      return existing;
    }
    const response = await this.esClient.mget<ConnectorCatalogStorageDocument>({
      index: this.indexName,
      ids: keys.map(({ id, version }) => definitionDocId(id, version)),
      _source: false,
    });
    for (const doc of response.docs) {
      if ('found' in doc && doc.found && doc._id) {
        existing.add(doc._id);
      }
    }
    return existing;
  }

  public async putDefinitionCreate(definition: StoredDefinition): Promise<'created' | 'exists'> {
    try {
      await this.client.index({
        id: definitionDocId(definition.id, definition.version),
        op_type: 'create',
        document: {
          docType: 'definition',
          id: definition.id,
          version: definition.version,
          yaml: definition.yaml,
          contentHash: definition.contentHash,
          catalogVersion: definition.catalogVersion,
          addedAt: definition.addedAt,
        },
      });
      return 'created';
    } catch (error) {
      if (isConflict(error)) {
        this.logger.debug(
          `Connector catalog definition ${definitionDocId(
            definition.id,
            definition.version
          )} already exists`
        );
        return 'exists';
      }
      throw error;
    }
  }

  public async getAsset(contentHash: string): Promise<StoredAsset | undefined> {
    try {
      const response = await this.esClient.get<ConnectorCatalogStorageDocument>({
        index: this.indexName,
        id: assetDocId(contentHash),
      });
      return toStoredAsset(response._source);
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  public async getAssets(hashes: string[]): Promise<Map<string, StoredAsset>> {
    const assets = new Map<string, StoredAsset>();
    if (hashes.length === 0) {
      return assets;
    }
    const response = await this.esClient.mget<ConnectorCatalogStorageDocument>({
      index: this.indexName,
      ids: hashes.map(assetDocId),
    });
    for (const doc of response.docs) {
      if (!('found' in doc) || !doc.found) {
        continue;
      }
      const asset = toStoredAsset(doc._source);
      if (asset) {
        assets.set(asset.contentHash, asset);
      }
    }
    return assets;
  }

  public async putAssetCreate(asset: StoredAsset): Promise<'created' | 'exists'> {
    try {
      await this.client.index({
        id: assetDocId(asset.contentHash),
        op_type: 'create',
        document: {
          docType: 'asset',
          contentHash: asset.contentHash,
          svg: asset.svg,
          addedAt: asset.addedAt,
        },
      });
      return 'created';
    } catch (error) {
      if (isConflict(error)) {
        this.logger.debug(
          `Connector catalog asset ${assetDocId(asset.contentHash)} already exists`
        );
        return 'exists';
      }
      throw error;
    }
  }
}

export const createConnectorCatalogStorage = (
  esClient: ElasticsearchClient,
  logger: Logger
): ConnectorCatalogStorage => {
  const adapter = new StorageIndexAdapter<
    typeof connectorCatalogStorageSettings,
    ConnectorCatalogStorageDocument
  >(esClient, logger, connectorCatalogStorageSettings);
  return new ConnectorCatalogStorage(esClient, adapter.getClient(), logger);
};
