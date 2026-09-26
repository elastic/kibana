/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { ConnectorCatalogStorageClient } from './catalog_storage';
import {
  ConnectorCatalogStorage,
  MANIFEST_DOC_ID,
  assetDocId,
  definitionDocId,
} from './catalog_storage';

const conflictError = () =>
  new errors.ResponseError({
    statusCode: 409,
    body: { error: { type: 'version_conflict_engine_exception' } },
    headers: {},
    warnings: [],
    meta: {} as never,
  });

const notFoundError = () =>
  new errors.ResponseError({
    statusCode: 404,
    body: { error: { type: 'index_not_found_exception' } },
    headers: {},
    warnings: [],
    meta: {} as never,
  });

describe('catalog storage ids', () => {
  it('builds definition, asset, and manifest document ids', () => {
    expect(definitionDocId('.abuseipdb', '1.1')).toBe('definition:.abuseipdb@1.1');
    expect(assetDocId('sha256:abc')).toBe('asset:abc');
    expect(MANIFEST_DOC_ID).toBe('manifest');
  });
});

describe('ConnectorCatalogStorage', () => {
  const createClients = () => {
    const esClient = {
      get: jest.fn(),
      mget: jest.fn(),
    };
    const client: jest.Mocked<ConnectorCatalogStorageClient> = {
      index: jest.fn(),
      search: jest.fn(),
    };
    const storage = new ConnectorCatalogStorage(
      esClient as unknown as ElasticsearchClient,
      client,
      loggerMock.create()
    );
    return { esClient, client, storage };
  };

  it('reads the manifest with a realtime get against the alias', async () => {
    const { esClient, storage } = createClients();
    esClient.get.mockResolvedValue({
      _source: {
        docType: 'manifest',
        bytes: '{}',
        signature: 'sig',
        sequence: 2,
        catalogVersion: 'sha256:aa',
        fetchedAt: '2026-09-17T12:00:00.000Z',
      },
      _seq_no: 4,
      _primary_term: 1,
    });

    await expect(storage.getManifest()).resolves.toEqual({
      bytes: '{}',
      signature: 'sig',
      sequence: 2,
      catalogVersion: 'sha256:aa',
      fetchedAt: '2026-09-17T12:00:00.000Z',
      seqNo: 4,
      primaryTerm: 1,
    });
    expect(esClient.get).toHaveBeenCalledWith({
      index: '.kibana_connector_catalog',
      id: 'manifest',
    });
  });

  it('returns undefined when the manifest is missing', async () => {
    const { esClient, storage } = createClients();
    esClient.get.mockRejectedValue(notFoundError());
    await expect(storage.getManifest()).resolves.toBeUndefined();
  });

  it('refuses to replace a manifest with an equal or lower sequence', async () => {
    const { storage, client } = createClients();
    await expect(
      storage.putManifest(
        {
          bytes: '{}',
          signature: 'sig',
          sequence: 1,
          catalogVersion: 'sha256:aa',
          fetchedAt: '2026-09-17T12:00:00.000Z',
        },
        1
      )
    ).resolves.toBe('stale');
    expect(client.index).not.toHaveBeenCalled();
  });

  it('treats a create-only definition conflict as exists', async () => {
    const { storage, client } = createClients();
    client.index.mockRejectedValue(conflictError());
    await expect(
      storage.putDefinitionCreate({
        id: '.abuseipdb',
        version: '1.0',
        yaml: 'id: .abuseipdb',
        contentHash: 'sha256:abc',
        catalogVersion: 'sha256:aa',
        addedAt: '2026-09-17T12:00:00.000Z',
      })
    ).resolves.toBe('exists');
  });

  it('reads definitions with realtime mget', async () => {
    const { esClient, storage } = createClients();
    esClient.mget.mockResolvedValue({
      docs: [
        {
          found: true,
          _id: 'definition:.abuseipdb@1.0',
          _source: {
            id: '.abuseipdb',
            version: '1.0',
            yaml: 'id: .abuseipdb',
            contentHash: 'sha256:abc',
            catalogVersion: 'sha256:aa',
            addedAt: '2026-09-17T12:00:00.000Z',
          },
        },
        { found: false, _id: 'definition:.okta@1.0' },
      ],
    });
    const result = await storage.getDefinitions([
      { id: '.abuseipdb', version: '1.0' },
      { id: '.okta', version: '1.0' },
    ]);
    expect(result.size).toBe(1);
    expect(esClient.mget).toHaveBeenCalledWith({
      index: '.kibana_connector_catalog',
      ids: ['definition:.abuseipdb@1.0', 'definition:.okta@1.0'],
    });
  });

  it('stores assets create-only', async () => {
    const { storage, client } = createClients();
    client.index.mockResolvedValue({} as never);
    await expect(
      storage.putAssetCreate({
        contentHash: 'sha256:abc',
        svg: '<svg />',
        addedAt: '2026-09-17T12:00:00.000Z',
      })
    ).resolves.toBe('created');
    expect(client.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'asset:abc',
        op_type: 'create',
      })
    );
  });
});
