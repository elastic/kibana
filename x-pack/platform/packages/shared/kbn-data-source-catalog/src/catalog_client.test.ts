/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { CatalogClient } from './catalog_client';
import { CATALOG_INDEX_NAME } from './constants';
import { catalogIndexMapping } from './index_mapping';
import type { DataSourceEntry } from './types';

const makeEntry = (id: string): DataSourceEntry => ({
  id,
  name: `entry-${id}`,
  type: 'index',
  mapping: {
    fields: [],
    total_field_count: 0,
    ecs_field_count: 0,
    ecs_field_coverage: 0,
  },
  catalog_version: 1,
  refreshed_at: '2024-01-01T00:00:00.000Z',
});

describe('CatalogClient', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let catalogClient: CatalogClient;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    catalogClient = new CatalogClient(esClient);
  });

  describe('ensureIndex', () => {
    it('creates the index if it does not exist', async () => {
      esClient.indices.exists.mockResolvedValue(false);

      await catalogClient.ensureIndex();

      expect(esClient.indices.exists).toHaveBeenCalledWith({ index: CATALOG_INDEX_NAME });
      expect(esClient.indices.create).toHaveBeenCalledWith({
        index: CATALOG_INDEX_NAME,
        mappings: catalogIndexMapping,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          auto_expand_replicas: '0-1',
        },
      });
    });

    it('skips creation if index already exists', async () => {
      esClient.indices.exists.mockResolvedValue(true);

      await catalogClient.ensureIndex();

      expect(esClient.indices.exists).toHaveBeenCalledWith({ index: CATALOG_INDEX_NAME });
      expect(esClient.indices.create).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpsert', () => {
    it('indexes entries via bulk API with correct _id and _index', async () => {
      esClient.bulk.mockResolvedValue({ errors: false, took: 1, items: [] });

      const entries = [makeEntry('a'), makeEntry('b')];
      await catalogClient.bulkUpsert(entries);

      expect(esClient.bulk).toHaveBeenCalledWith({
        operations: [
          { index: { _index: CATALOG_INDEX_NAME, _id: 'a' } },
          entries[0],
          { index: { _index: CATALOG_INDEX_NAME, _id: 'b' } },
          entries[1],
        ],
        refresh: 'wait_for',
      });
    });

    it('throws when bulk response has errors', async () => {
      esClient.bulk.mockResolvedValue({
        errors: true,
        took: 1,
        items: [
          { index: { _index: CATALOG_INDEX_NAME, _id: 'a', status: 400, error: { type: 'mapper_parsing_exception', reason: 'mapping error' } } },
        ],
      });

      await expect(catalogClient.bulkUpsert([makeEntry('a')])).rejects.toThrow(
        'Bulk upsert had errors: mapping error'
      );
    });

    it('returns early for empty array without calling bulk', async () => {
      await catalogClient.bulkUpsert([]);

      expect(esClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('deleteAll', () => {
    it('calls deleteByQuery with match_all on the catalog index', async () => {
      await catalogClient.deleteAll();

      expect(esClient.deleteByQuery).toHaveBeenCalledWith({
        index: CATALOG_INDEX_NAME,
        query: { match_all: {} },
        refresh: true,
      });
    });
  });
});
