/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { searchEntitiesV2, searchEntitiesV2Batch } from './search_entities';

describe('searchEntitiesV2', () => {
  it('throws when filterQuery is not valid JSON', async () => {
    const esClient = {
      search: jest.fn(),
    } as unknown as ElasticsearchClient;

    await expect(
      searchEntitiesV2({
        esClient,
        namespace: 'default',
        entityTypes: ['host'],
        filterQuery: 'not-json',
        page: 1,
        perPage: 10,
        sortField: '@timestamp',
        sortOrder: 'desc',
      })
    ).rejects.toThrow('Invalid filterQuery');
  });

  it('searches the v2 latest index with entity type and filter clauses', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: {
        total: 1,
        hits: [
          {
            _source: {
              host: { name: 'h1' },
              entity: { EngineMetadata: { Type: 'host' }, lifecycle: { first_seen: 't0' } },
            },
          },
        ],
      },
    });
    const esClient = { search } as unknown as ElasticsearchClient;

    const result = await searchEntitiesV2({
      esClient,
      namespace: 'default',
      entityTypes: ['host'],
      filterQuery: JSON.stringify({ term: { 'host.name': 'h1' } }),
      page: 1,
      perPage: 5,
      sortField: '@timestamp',
      sortOrder: 'desc',
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ['.entities.v2.latest.default-00001'],
        query: {
          bool: {
            must: [
              { terms: { 'entity.EngineMetadata.Type': ['host'] } },
              { term: { 'host.name': 'h1' } },
            ],
          },
        },
        size: 5,
        from: 0,
        ignore_unavailable: true,
      })
    );
    expect(result.total).toBe(1);
    expect(result.records).toHaveLength(1);
    expect(result.inspect.dsl).toHaveLength(1);
  });
});

describe('searchEntitiesV2Batch', () => {
  const baseParams = {
    entityTypes: [] as never[],
    page: 1,
    perPage: 10,
    sortField: '@timestamp',
    sortOrder: 'desc' as const,
  };

  it('returns [] and issues no request when queries is empty', async () => {
    const msearch = jest.fn();
    const esClient = { msearch } as unknown as ElasticsearchClient;

    const result = await searchEntitiesV2Batch({ esClient, namespace: 'default', queries: [] });

    expect(result).toEqual([]);
    expect(msearch).not.toHaveBeenCalled();
  });

  it('resolves the index once and issues a single msearch for multiple queries', async () => {
    const msearch = jest.fn().mockResolvedValue({
      responses: [
        { hits: { total: 1, hits: [{ _source: { entity: { id: 'a' } } }] } },
        { hits: { total: 0, hits: [] } },
      ],
    });
    const esClient = { msearch } as unknown as ElasticsearchClient;

    const result = await searchEntitiesV2Batch({
      esClient,
      namespace: 'default',
      queries: [
        { ...baseParams, filterQuery: JSON.stringify({ term: { a: 1 } }) },
        { ...baseParams, sortField: 'entity.lifecycle.first_seen' },
      ],
    });

    expect(msearch).toHaveBeenCalledTimes(1);
    const { searches } = msearch.mock.calls[0][0];
    // header + body per query, alternating
    expect(searches).toHaveLength(4);
    expect(searches[0]).toEqual({
      index: ['.entities.v2.latest.default-00001'],
      ignore_unavailable: true,
    });
    expect(searches[2]).toEqual({
      index: ['.entities.v2.latest.default-00001'],
      ignore_unavailable: true,
    });

    expect(result).toHaveLength(2);
    expect((result[0] as { records: unknown[] }).records).toHaveLength(1);
    expect((result[1] as { records: unknown[] }).records).toHaveLength(0);
  });

  it('surfaces a per-item ES error without failing the whole batch', async () => {
    const msearch = jest.fn().mockResolvedValue({
      responses: [
        { error: { type: 'search_phase_execution_exception', reason: 'boom' } },
        { hits: { total: 0, hits: [] } },
      ],
    });
    const esClient = { msearch } as unknown as ElasticsearchClient;

    const result = await searchEntitiesV2Batch({
      esClient,
      namespace: 'default',
      queries: [baseParams, baseParams],
    });

    expect(result[0]).toEqual({ error: 'boom' });
    expect((result[1] as { total: number }).total).toBe(0);
  });

  it('surfaces a missing msearch response as a per-item error without throwing', async () => {
    const msearch = jest.fn().mockResolvedValue({
      responses: [{ hits: { total: 0, hits: [] } }],
    });
    const esClient = { msearch } as unknown as ElasticsearchClient;

    const result = await searchEntitiesV2Batch({
      esClient,
      namespace: 'default',
      queries: [baseParams, baseParams],
    });

    expect((result[0] as { total: number }).total).toBe(0);
    expect(result[1]).toEqual({ error: 'Missing msearch response for query' });
  });

  it('surfaces a per-item filterQuery parse error without issuing a request for it', async () => {
    const msearch = jest.fn().mockResolvedValue({
      responses: [{ hits: { total: 0, hits: [] } }],
    });
    const esClient = { msearch } as unknown as ElasticsearchClient;

    const result = await searchEntitiesV2Batch({
      esClient,
      namespace: 'default',
      queries: [{ ...baseParams, filterQuery: 'not-json' }, baseParams],
    });

    expect(result[0]).toEqual({ error: expect.any(String) });
    expect((result[1] as { total: number }).total).toBe(0);
    // Only the valid query reached ES.
    const { searches } = msearch.mock.calls[0][0];
    expect(searches).toHaveLength(2);
  });
});
