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
  it('builds definition and asset document ids', () => {
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

  it('returns seqNo and primaryTerm from a realtime get', async () => {
    const { esClient, storage } = createClients();
    esClient.get.mockResolvedValue({
      _source: {
        bytes: '{}',
        signature: 'sig',
        sequence: 2,
        catalogVersion: 'catalog-2',
        fetchedAt: '2026-09-17T12:00:00.000Z',
      },
      _seq_no: 4,
      _primary_term: 1,
    });
    await expect(storage.getManifest()).resolves.toEqual({
      bytes: '{}',
      signature: 'sig',
      sequence: 2,
      catalogVersion: 'catalog-2',
      fetchedAt: '2026-09-17T12:00:00.000Z',
      seqNo: 4,
      primaryTerm: 1,
    });
    expect(esClient.get).toHaveBeenCalledWith({
      index: '.kibana_connector_catalog',
      id: 'manifest',
    });
  });

  it('returns undefined on 404 and on an incomplete source', async () => {
    const { esClient, storage } = createClients();
    esClient.get.mockRejectedValueOnce(notFoundError());
    await expect(storage.getManifest()).resolves.toBeUndefined();
    esClient.get.mockResolvedValueOnce({ _source: { sequence: 1 } });
    await expect(storage.getManifest()).resolves.toBeUndefined();
  });

  it('returns stale on a lower or equal sequence without indexing', async () => {
    const { storage, client } = createClients();
    await expect(
      storage.putManifest(
        {
          bytes: '{}',
          signature: 'sig',
          sequence: 1,
          catalogVersion: 'catalog-1',
          fetchedAt: '2026-09-17T12:00:00.000Z',
        },
        1
      )
    ).resolves.toBe('stale');
    expect(client.index).not.toHaveBeenCalled();
  });

  it('returns stale on 409 and passes optimistic concurrency fields', async () => {
    const { storage, client } = createClients();
    client.index.mockRejectedValueOnce(conflictError());
    await expect(
      storage.putManifest(
        {
          bytes: '{}',
          signature: 'sig',
          sequence: 2,
          catalogVersion: 'catalog-2',
          fetchedAt: '2026-09-17T12:00:00.000Z',
          seqNo: 4,
          primaryTerm: 1,
        },
        1
      )
    ).resolves.toBe('stale');
    expect(client.index).toHaveBeenCalledWith(
      expect.objectContaining({ if_seq_no: 4, if_primary_term: 1 })
    );
  });

  it('creates a definition and returns exists on 409', async () => {
    const { storage, client } = createClients();
    client.index.mockRejectedValueOnce(conflictError());
    await expect(
      storage.putDefinitionCreate({
        id: '.abuseipdb',
        version: '1.0',
        yaml: 'id: .abuseipdb',
        contentHash: 'sha256:abc',
        catalogVersion: 'catalog-1',
        addedAt: '2026-09-17T12:00:00.000Z',
      })
    ).resolves.toBe('exists');
    expect(client.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'definition:.abuseipdb@1.0',
        op_type: 'create',
      })
    );
  });

  it('ignores not-found docs in getAssets and existsDefinitions', async () => {
    const { esClient, storage } = createClients();
    esClient.mget.mockResolvedValue({
      docs: [
        { found: false, _id: 'asset:abc' },
        { found: false, _id: 'definition:.okta@1.0' },
      ],
    });
    await expect(storage.getAssets(['sha256:abc'])).resolves.toEqual(new Map());
    esClient.mget.mockResolvedValue({
      docs: [{ found: false, _id: 'definition:.okta@1.0' }],
    });
    await expect(storage.existsDefinitions([{ id: '.okta', version: '1.0' }])).resolves.toEqual(
      new Set()
    );
  });
});
