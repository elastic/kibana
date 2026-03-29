/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { CatalogQuery } from './catalog_query';
import { CATALOG_INDEX_NAME } from './constants';
import type { DataSourceEntry } from './types';

const mockEntry: DataSourceEntry = {
  id: 'logs-endpoint.events.network-default',
  name: 'logs-endpoint.events.network-default',
  type: 'data_stream',
  mapping: {
    fields: [
      { name: 'source.ip', type: 'ip', ecs: true, searchable: true, aggregatable: true },
      { name: 'destination.port', type: 'long', ecs: true, searchable: true, aggregatable: true },
    ],
    total_field_count: 2,
    ecs_field_count: 2,
    ecs_field_coverage: 1.0,
  },
  integration: {
    package_name: 'endpoint',
    package_title: 'Elastic Defend',
    package_version: '8.13.0',
    integration_name: 'endpoint',
    dataset: 'endpoint.events.network',
    description: 'Collects network events from Elastic Defend',
    data_stream_title: 'Endpoint Network Events',
  },
  stats: {
    doc_count: 500000,
    size_bytes: 1024 * 1024 * 100,
    last_ingested_at: '2024-01-15T12:00:00.000Z',
    is_active: true,
    freshness_category: 'live',
  },
  semantic: {
    summary: 'Network events including DNS, HTTP, and socket activity from Elastic Defend',
    topics: ['network', 'security', 'endpoint'],
  },
  catalog_version: 1,
  refreshed_at: '2024-01-15T12:00:00.000Z',
};

const makeSearchResponse = (entries: DataSourceEntry[], total = entries.length) => ({
  hits: {
    total: { value: total, relation: 'eq' as const },
    hits: entries.map((entry) => ({ _source: entry })),
  },
});

describe('CatalogQuery', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let catalogQuery: CatalogQuery;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    catalogQuery = new CatalogQuery(esClient);
    esClient.search.mockResolvedValue(makeSearchResponse([mockEntry]) as any);
  });

  it('searches by name pattern using wildcard query', async () => {
    await catalogQuery.search({ namePattern: 'logs-endpoint.*' });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: CATALOG_INDEX_NAME,
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([
              { wildcard: { name: { value: 'logs-endpoint.*' } } },
            ]),
          }),
        }),
      })
    );
  });

  it('filters by integration package using term query', async () => {
    await catalogQuery.search({ integrationPackage: 'endpoint' });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([
              { term: { 'integration.package_name': 'endpoint' } },
            ]),
          }),
        }),
      })
    );
  });

  it('filters by field existence using nested query', async () => {
    await catalogQuery.search({ hasFields: ['source.ip', 'destination.port'] });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([
              {
                nested: {
                  path: 'mapping.fields',
                  query: { term: { 'mapping.fields.name': 'source.ip' } },
                },
              },
              {
                nested: {
                  path: 'mapping.fields',
                  query: { term: { 'mapping.fields.name': 'destination.port' } },
                },
              },
            ]),
          }),
        }),
      })
    );
  });

  it('applies activeOnly filter using term query on stats.is_active', async () => {
    await catalogQuery.search({ activeOnly: true });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([{ term: { 'stats.is_active': true } }]),
          }),
        }),
      })
    );
  });

  it('applies full-text search across name and description using multi_match', async () => {
    await catalogQuery.search({ searchText: 'network endpoint' });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            should: expect.arrayContaining([
              {
                multi_match: {
                  query: 'network endpoint',
                  fields: ['name.text', 'integration.description', 'semantic.summary'],
                  type: 'best_fields',
                },
              },
            ]),
            minimum_should_match: 1,
          }),
        }),
      })
    );
  });

  it('defaults size to 10 when not specified', async () => {
    await catalogQuery.search({});

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ size: 10 })
    );
  });

  it('returns empty result when no hits', async () => {
    esClient.search.mockResolvedValue(makeSearchResponse([], 0) as any);

    const result = await catalogQuery.search({});

    expect(result).toEqual({ entries: [], total: 0 });
  });

  it('includes kNN search when embedding is provided', async () => {
    const embedding = new Array(384).fill(0.1);
    await catalogQuery.search({ embedding, size: 5 });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        knn: expect.objectContaining({
          field: 'semantic.embedding',
          query_vector: embedding,
          k: 5,
          num_candidates: 100,
        }),
      })
    );
  });

  it('returns entries and total from search response', async () => {
    esClient.search.mockResolvedValue(makeSearchResponse([mockEntry], 42) as any);

    const result = await catalogQuery.search({ integrationPackage: 'endpoint' });

    expect(result.total).toBe(42);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toEqual(mockEntry);
  });
});
