/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import type {
  ConnectorCatalogStorageClient,
  StoredCatalogDefinition,
  StoredCatalogView,
} from './catalog_storage';
import { ConnectorCatalogStorage, catalogDocId, definitionDocId } from './catalog_storage';

const conflictError = (statusCode: number) =>
  new errors.ResponseError({
    statusCode,
    body: { error: { type: 'version_conflict_engine_exception' } },
    headers: {},
    warnings: [],
    meta: {} as never,
  });

const definition: StoredCatalogDefinition = {
  id: '.abuseipdb',
  version: '1.1.0',
  yaml: 'id: .abuseipdb',
  iconSvg: '<svg />',
  contentHash: 'sha256:abc',
  addedAt: '2026-09-17T12:00:00.000Z',
};

const view: StoredCatalogView = {
  catalogVersion: 'snapshot:abuseipdb-1.1.0',
  fetchedAt: '2026-09-17T12:00:00.000Z',
  kibanaMinor: '9.3',
  rows: [
    {
      id: '.abuseipdb',
      version: '1.1.0',
      contentHash: 'sha256:abc',
      definitionId: 'definition:.abuseipdb@1.1.0',
    },
  ],
};

describe('catalog storage ids', () => {
  it('builds definition and catalog document ids', () => {
    expect(definitionDocId('.abuseipdb', '1.1.0')).toBe('definition:.abuseipdb@1.1.0');
    expect(catalogDocId('9.3')).toBe('catalog:9.3');
  });
});

describe('ConnectorCatalogStorage', () => {
  const createClient = (): jest.Mocked<ConnectorCatalogStorageClient> => ({
    get: jest.fn(),
    index: jest.fn(),
    search: jest.fn(),
  });

  describe('getDefinitions', () => {
    it('reads many definitions with one ids query and drops incomplete hits', async () => {
      const client = createClient();
      client.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'definition:.abuseipdb@1.1.0',
              _source: { docType: 'definition', ...definition },
            },
            {
              _id: 'definition:.abuseipdb@1.0.0',
              _source: { docType: 'definition', id: '.abuseipdb' },
            },
          ],
        },
      } as never);
      const storage = new ConnectorCatalogStorage(client, loggerMock.create());

      const result = await storage.getDefinitions([
        { id: '.abuseipdb', version: '1.1.0' },
        { id: '.abuseipdb', version: '1.0.0' },
      ]);

      expect([...result.keys()]).toEqual(['definition:.abuseipdb@1.1.0']);
      expect(result.get('definition:.abuseipdb@1.1.0')).toEqual(definition);
      expect(client.search).toHaveBeenCalledWith({
        size: 2,
        track_total_hits: false,
        query: { ids: { values: ['definition:.abuseipdb@1.1.0', 'definition:.abuseipdb@1.0.0'] } },
      });
    });

    it('does not query when no keys are requested', async () => {
      const client = createClient();
      const storage = new ConnectorCatalogStorage(client, loggerMock.create());

      await expect(storage.getDefinitions([])).resolves.toEqual(new Map());
      expect(client.search).not.toHaveBeenCalled();
    });
  });

  it('indexes a definition with op_type create', async () => {
    const client = createClient();
    client.index.mockResolvedValue({} as never);
    const storage = new ConnectorCatalogStorage(client, loggerMock.create());

    await expect(storage.putDefinitionCreate(definition)).resolves.toBe('created');
    expect(client.index).toHaveBeenCalledWith({
      id: 'definition:.abuseipdb@1.1.0',
      op_type: 'create',
      document: expect.objectContaining({
        docType: 'definition',
        id: '.abuseipdb',
        version: '1.1.0',
        contentHash: 'sha256:abc',
      }),
    });
  });

  it('treats a 409 on definition create as already exists', async () => {
    const client = createClient();
    client.index.mockRejectedValue(conflictError(409));
    const storage = new ConnectorCatalogStorage(client, loggerMock.create());

    await expect(storage.putDefinitionCreate(definition)).resolves.toBe('exists');
  });

  it('returns a catalog view with seq_no metadata', async () => {
    const client = createClient();
    client.get.mockResolvedValue({
      _source: {
        catalogVersion: view.catalogVersion,
        fetchedAt: view.fetchedAt,
        kibanaMinor: view.kibanaMinor,
        rows: view.rows,
      },
      _seq_no: 3,
      _primary_term: 1,
    } as never);
    const storage = new ConnectorCatalogStorage(client, loggerMock.create());

    await expect(storage.getCatalogView('9.3')).resolves.toEqual({
      view,
      seqNo: 3,
      primaryTerm: 1,
    });
    expect(client.get).toHaveBeenCalledWith({ id: 'catalog:9.3' });
  });

  it('returns undefined when the catalog document is missing', async () => {
    const client = createClient();
    client.get.mockRejectedValue(conflictError(404));
    const storage = new ConnectorCatalogStorage(client, loggerMock.create());

    await expect(storage.getCatalogView('9.3')).resolves.toBeUndefined();
  });

  it('CAS-updates the catalog view and maps 409 to conflict', async () => {
    const client = createClient();
    client.index.mockRejectedValue(conflictError(409));
    const storage = new ConnectorCatalogStorage(client, loggerMock.create());

    await expect(storage.putCatalogViewCas(view, 3, 1)).resolves.toBe('conflict');
    expect(client.index).toHaveBeenCalledWith({
      id: 'catalog:9.3',
      if_seq_no: 3,
      if_primary_term: 1,
      document: expect.objectContaining({
        docType: 'catalog',
        catalogVersion: view.catalogVersion,
      }),
    });
  });

  it('returns a definition document by id and version', async () => {
    const client = createClient();
    client.get.mockResolvedValue({ _source: definition } as never);
    const storage = new ConnectorCatalogStorage(client, loggerMock.create());

    await expect(storage.getDefinition('.abuseipdb', '1.1.0')).resolves.toEqual(definition);
    expect(client.get).toHaveBeenCalledWith({ id: 'definition:.abuseipdb@1.1.0' });
  });
});
