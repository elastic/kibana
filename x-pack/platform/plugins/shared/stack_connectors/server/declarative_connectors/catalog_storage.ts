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

export const CONNECTOR_CATALOG_INDEX_NAME = '.kibana_connector_catalog';

export const definitionDocId = (id: string, version: string): string =>
  `definition:${id}@${version}`;

export const catalogDocId = (kibanaMinor: string): string => `catalog:${kibanaMinor}`;

export const connectorCatalogStorageSettings = {
  name: CONNECTOR_CATALOG_INDEX_NAME,
  schema: {
    properties: {
      docType: types.keyword(),
      id: types.keyword(),
      version: types.keyword(),
      yaml: types.text({ index: false }),
      iconSvg: types.text({ index: false }),
      contentHash: types.keyword(),
      addedAt: types.date(),
      catalogVersion: types.keyword(),
      fetchedAt: types.date(),
      kibanaMinor: types.keyword(),
      rows: types.object({ enabled: false }),
    },
  },
} satisfies IndexStorageSettings;

export interface StoredCatalogDefinition {
  id: string;
  version: string;
  yaml: string;
  iconSvg?: string;
  contentHash: string;
  addedAt: string;
}

export interface StoredCatalogRow {
  id: string;
  version: string;
  contentHash: string;
  definitionId: string;
}

export interface StoredCatalogView {
  catalogVersion: string;
  fetchedAt: string;
  kibanaMinor: string;
  rows: StoredCatalogRow[];
}

export interface ConnectorCatalogStorageDocument {
  _id?: string;
  docType?: 'definition' | 'catalog';
  id?: string;
  version?: string;
  yaml?: string;
  iconSvg?: string;
  contentHash?: string;
  addedAt?: string;
  catalogVersion?: string;
  fetchedAt?: string;
  kibanaMinor?: string;
  rows?: StoredCatalogRow[];
}

export interface CatalogViewRecord {
  view: StoredCatalogView;
  seqNo?: number;
  primaryTerm?: number;
}

export type ConnectorCatalogStorageClient = Pick<
  InternalIStorageClient<ConnectorCatalogStorageDocument>,
  'get' | 'index'
>;

export class ConnectorCatalogStorage {
  constructor(
    private readonly client: ConnectorCatalogStorageClient,
    private readonly logger: Logger
  ) {}

  public async getCatalogView(kibanaMinor: string): Promise<CatalogViewRecord | undefined> {
    try {
      const response = await this.client.get({ id: catalogDocId(kibanaMinor) });
      const source = response._source;
      if (
        source?.catalogVersion === undefined ||
        source.fetchedAt === undefined ||
        source.kibanaMinor === undefined
      ) {
        return undefined;
      }
      return {
        view: {
          catalogVersion: source.catalogVersion,
          fetchedAt: source.fetchedAt,
          kibanaMinor: source.kibanaMinor,
          rows: source.rows ?? [],
        },
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

  public async getDefinition(
    id: string,
    version: string
  ): Promise<StoredCatalogDefinition | undefined> {
    try {
      const response = await this.client.get({ id: definitionDocId(id, version) });
      const source = response._source;
      if (
        source?.id === undefined ||
        source.version === undefined ||
        source.yaml === undefined ||
        source.contentHash === undefined ||
        source.addedAt === undefined
      ) {
        return undefined;
      }
      return {
        id: source.id,
        version: source.version,
        yaml: source.yaml,
        iconSvg: source.iconSvg,
        contentHash: source.contentHash,
        addedAt: source.addedAt,
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  public async putDefinitionCreate(
    definition: StoredCatalogDefinition
  ): Promise<'created' | 'exists'> {
    try {
      await this.client.index({
        id: definitionDocId(definition.id, definition.version),
        op_type: 'create',
        document: {
          docType: 'definition',
          id: definition.id,
          version: definition.version,
          yaml: definition.yaml,
          iconSvg: definition.iconSvg,
          contentHash: definition.contentHash,
          addedAt: definition.addedAt,
        },
      });
      return 'created';
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 409) {
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

  public async putCatalogView(view: StoredCatalogView): Promise<void> {
    await this.client.index({
      id: catalogDocId(view.kibanaMinor),
      document: {
        docType: 'catalog',
        catalogVersion: view.catalogVersion,
        fetchedAt: view.fetchedAt,
        kibanaMinor: view.kibanaMinor,
        rows: view.rows,
      },
    });
  }

  public async putCatalogViewCas(
    view: StoredCatalogView,
    seqNo: number,
    primaryTerm: number
  ): Promise<'updated' | 'conflict'> {
    try {
      await this.client.index({
        id: catalogDocId(view.kibanaMinor),
        if_seq_no: seqNo,
        if_primary_term: primaryTerm,
        document: {
          docType: 'catalog',
          catalogVersion: view.catalogVersion,
          fetchedAt: view.fetchedAt,
          kibanaMinor: view.kibanaMinor,
          rows: view.rows,
        },
      });
      return 'updated';
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 409) {
        return 'conflict';
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
  return new ConnectorCatalogStorage(adapter.getClient(), logger);
};
