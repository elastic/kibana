/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createConnectorCatalogStorage } from './connector_catalog_storage';
import { CONNECTOR_TYPE_CATALOG_INDEX } from './constants';
import type { StoredCatalogDefinition } from './types';

const createResponseError = (statusCode: number, type: string): errors.ResponseError =>
  new errors.ResponseError({
    statusCode,
    body: { error: { type, reason: type } },
    warnings: [],
    headers: {},
    meta: {} as never,
  });

const definition: StoredCatalogDefinition = {
  connectorId: '.catalog-test',
  version: '1.0.0',
  yaml: 'id: .catalog-test',
  contentHash: 'sha256:abc',
  catalogVersion: '2026.11.1',
};

describe('createConnectorCatalogStorage', () => {
  const esClient = elasticsearchClientMock.createElasticsearchClient();
  const storage = createConnectorCatalogStorage({
    esClient,
    logger: loggingSystemMock.createLogger(),
  });

  beforeEach(() => {
    jest.resetAllMocks();
    // Lets the adapter bootstrap run on writes: no template, no index yet.
    esClient.info.mockResolvedValue({ version: { build_flavor: 'default' } } as never);
    esClient.indices.putIndexTemplate.mockResolvedValue({ acknowledged: true });
    esClient.indices.get.mockResolvedValue({});
    esClient.indices.create.mockResolvedValue({
      acknowledged: true,
      shards_acknowledged: true,
      index: `${CONNECTOR_TYPE_CATALOG_INDEX}-000001`,
    });
  });

  describe('lazy index setup', () => {
    it('does not touch Elasticsearch when created', () => {
      expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(esClient.indices.create).not.toHaveBeenCalled();
    });

    it('installs the template with the write alias, mappings before the first write', async () => {
      esClient.index.mockResolvedValue({} as never);

      await storage.replaceManifest({ raw: '{}' });

      expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(1);
      const [template] = esClient.indices.putIndexTemplate.mock.calls[0];
      expect(template).toEqual(
        expect.objectContaining({
          name: CONNECTOR_TYPE_CATALOG_INDEX,
          template: expect.objectContaining({
            aliases: { [CONNECTOR_TYPE_CATALOG_INDEX]: { is_write_index: true } },
            mappings: expect.objectContaining({
              properties: expect.objectContaining({
                connectorId: expect.objectContaining({ type: 'keyword' }),
                yaml: expect.objectContaining({ type: 'text', index: false }),
              }),
            }),
          }),
        })
      );
      expect(esClient.indices.create).toHaveBeenCalledTimes(1);
    });

    it('does not create anything on reads', async () => {
      esClient.get.mockRejectedValue(createResponseError(404, 'index_not_found_exception'));

      await storage.getManifest();

      expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(esClient.indices.create).not.toHaveBeenCalled();
    });
  });

  describe('getManifest', () => {
    it('reads the manifest document by its fixed id', async () => {
      esClient.get.mockResolvedValue({
        _index: CONNECTOR_TYPE_CATALOG_INDEX,
        _id: 'manifest',
        found: true,
        _source: { type: 'manifest', raw: '{"connectors":[]}' },
      });

      await expect(storage.getManifest()).resolves.toEqual({ raw: '{"connectors":[]}' });
      expect(esClient.get).toHaveBeenCalledWith(
        { index: CONNECTOR_TYPE_CATALOG_INDEX, id: 'manifest' },
        { signal: undefined }
      );
    });

    it('returns undefined when the index is missing', async () => {
      esClient.get.mockRejectedValue(createResponseError(404, 'index_not_found_exception'));

      await expect(storage.getManifest()).resolves.toBeUndefined();
    });

    it('returns undefined when the document is missing', async () => {
      esClient.get.mockRejectedValue(createResponseError(404, 'not_found'));

      await expect(storage.getManifest()).resolves.toBeUndefined();
    });

    it('rethrows other errors', async () => {
      esClient.get.mockRejectedValue(createResponseError(500, 'boom'));

      await expect(storage.getManifest()).rejects.toThrow();
    });
  });

  describe('getDefinitions', () => {
    it('does not call Elasticsearch for an empty list', async () => {
      await expect(storage.getDefinitions([])).resolves.toEqual([]);
      expect(esClient.mget).not.toHaveBeenCalled();
    });

    it('reads all definitions with 1 mget and drops missing documents', async () => {
      esClient.mget.mockResolvedValue({
        docs: [
          {
            _index: CONNECTOR_TYPE_CATALOG_INDEX,
            _id: 'definition:.catalog-test@1.0.0',
            found: true,
            _source: { type: 'definition', ...definition },
          },
          { _index: CONNECTOR_TYPE_CATALOG_INDEX, _id: 'definition:.other@1.0.0', found: false },
        ],
      });

      const result = await storage.getDefinitions([
        { id: '.catalog-test', version: '1.0.0' },
        { id: '.other', version: '1.0.0' },
      ]);

      expect(result).toEqual([definition]);
      expect(esClient.mget).toHaveBeenCalledTimes(1);
      expect(esClient.mget).toHaveBeenCalledWith(
        {
          index: CONNECTOR_TYPE_CATALOG_INDEX,
          ids: ['definition:.catalog-test@1.0.0', 'definition:.other@1.0.0'],
        },
        { signal: undefined }
      );
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('returns an empty list when the index is missing', async () => {
      esClient.mget.mockRejectedValue(createResponseError(404, 'index_not_found_exception'));

      await expect(storage.getDefinitions([{ id: '.a', version: '1.0.0' }])).resolves.toEqual([]);
    });
  });

  describe('create-only writes', () => {
    it('createDefinition uses op_type create', async () => {
      esClient.index.mockResolvedValue({
        _index: CONNECTOR_TYPE_CATALOG_INDEX,
        _id: 'definition:.catalog-test@1.0.0',
        _version: 1,
        result: 'created',
        _shards: { total: 1, successful: 1, failed: 0 },
        _seq_no: 0,
        _primary_term: 1,
      });

      await expect(storage.createDefinition(definition)).resolves.toEqual({ created: true });
      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: CONNECTOR_TYPE_CATALOG_INDEX,
          id: 'definition:.catalog-test@1.0.0',
          op_type: 'create',
          require_alias: true,
        })
      );
    });

    it('createDefinition counts a 409 as not created', async () => {
      esClient.index.mockRejectedValue(
        createResponseError(409, 'version_conflict_engine_exception')
      );

      await expect(storage.createDefinition(definition)).resolves.toEqual({ created: false });
    });

    it('createDefinition rethrows other errors', async () => {
      esClient.index.mockRejectedValue(createResponseError(500, 'boom'));

      await expect(storage.createDefinition(definition)).rejects.toThrow();
    });

    it('createAsset uses op_type create and counts a 409 as not created', async () => {
      esClient.index.mockRejectedValue(
        createResponseError(409, 'version_conflict_engine_exception')
      );

      await expect(storage.createAsset({ sha256: 'abc', content: 'Zm9v' })).resolves.toEqual({
        created: false,
      });
      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'asset:abc', op_type: 'create' })
      );
    });
  });

  describe('replaceManifest', () => {
    it('overwrites the document with the fixed id', async () => {
      esClient.index.mockResolvedValue({
        _index: CONNECTOR_TYPE_CATALOG_INDEX,
        _id: 'manifest',
        _version: 2,
        result: 'updated',
        _shards: { total: 1, successful: 1, failed: 0 },
        _seq_no: 1,
        _primary_term: 1,
      });

      await storage.replaceManifest({ raw: '{"connectors":[]}' });

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: CONNECTOR_TYPE_CATALOG_INDEX,
          id: 'manifest',
          document: { type: 'manifest', raw: '{"connectors":[]}' },
        })
      );
      expect(esClient.index).not.toHaveBeenCalledWith(
        expect.objectContaining({ op_type: 'create' })
      );
    });
  });
});
