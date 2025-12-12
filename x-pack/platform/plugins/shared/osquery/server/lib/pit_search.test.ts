/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchTotalHitsRelation } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { executePitSearch } from './pit_search';
import { Direction } from '../../common/search_strategy';

// Mock the buildResultsQuery function
jest.mock('../search_strategy/osquery/factory/results/query.all_results.dsl', () => ({
  buildResultsQuery: jest.fn((options: { pitId?: string; searchAfter?: unknown; pagination: { querySize: number } }) => ({
    pit: options.pitId ? { id: options.pitId, keep_alive: '10m' } : undefined,
    search_after: options.searchAfter,
    size: options.pagination.querySize,
    query: { bool: { filter: [] } },
  })),
}));

const createMockSearchResponse = (
  overrides: {
    hits?: Array<{ _id: string; _index: string; sort?: number[]; fields?: Record<string, unknown> }>;
    total?: number | { value: number; relation: SearchTotalHitsRelation };
    pit_id?: string;
  } = {}
) => ({
  took: 10,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    hits: overrides.hits ?? [],
    total: overrides.total ?? { value: 0, relation: 'eq' as SearchTotalHitsRelation },
  },
  ...(overrides.pit_id ? { pit_id: overrides.pit_id } : {}),
});

describe('executePitSearch', () => {
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  const baseParams = {
    pitId: 'pit-123',
    size: 50,
    actionId: 'action-123',
    sort: [{ field: '@timestamp', direction: Direction.desc }],
  };

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    jest.clearAllMocks();
  });

  it('should execute search with PIT parameters', async () => {
    mockEsClient.search.mockResolvedValue(
      createMockSearchResponse({
        hits: [{ _id: '1', _index: 'test', sort: [123, 456] }],
        total: { value: 100, relation: 'eq' },
        pit_id: 'refreshed-pit',
      })
    );

    const result = await executePitSearch({
      esClient: mockEsClient,
      ...baseParams,
    });

    expect(mockEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        pit: { id: 'pit-123', keep_alive: '10m' },
      })
    );
    expect(result.pitId).toBe('refreshed-pit');
  });

  it('should pass searchAfter for subsequent pages', async () => {
    mockEsClient.search.mockResolvedValue(createMockSearchResponse());

    await executePitSearch({
      esClient: mockEsClient,
      ...baseParams,
      searchAfter: [1733900000000, 12345],
    });

    expect(mockEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        search_after: [1733900000000, 12345],
      })
    );
  });

  it('should handle total as object (ES 7.x+ format)', async () => {
    mockEsClient.search.mockResolvedValue(
      createMockSearchResponse({ total: { value: 500, relation: 'eq' } })
    );

    const result = await executePitSearch({
      esClient: mockEsClient,
      ...baseParams,
    });

    expect(result.total).toBe(500);
  });

  it('should handle total as number (legacy format)', async () => {
    mockEsClient.search.mockResolvedValue(createMockSearchResponse({ total: 250 }));

    const result = await executePitSearch({
      esClient: mockEsClient,
      ...baseParams,
    });

    expect(result.total).toBe(250);
  });

  it('should extract searchAfter from last hit sort values', async () => {
    mockEsClient.search.mockResolvedValue(
      createMockSearchResponse({
        hits: [
          { _id: '1', _index: 'test', sort: [1733900000000, 1] },
          { _id: '2', _index: 'test', sort: [1733900001000, 2] },
          { _id: '3', _index: 'test', sort: [1733900002000, 3] },
        ],
        total: { value: 100, relation: 'eq' },
      })
    );

    const result = await executePitSearch({
      esClient: mockEsClient,
      ...baseParams,
    });

    expect(result.searchAfter).toEqual([1733900002000, 3]);
  });

  it('should return undefined searchAfter when no hits', async () => {
    mockEsClient.search.mockResolvedValue(createMockSearchResponse());

    const result = await executePitSearch({
      esClient: mockEsClient,
      ...baseParams,
    });

    expect(result.searchAfter).toBeUndefined();
  });

  it('should include integration namespaces in query params', async () => {
    mockEsClient.search.mockResolvedValue(createMockSearchResponse());

    await executePitSearch({
      esClient: mockEsClient,
      ...baseParams,
      integrationNamespaces: ['namespace1', 'namespace2'],
    });

    expect(mockEsClient.search).toHaveBeenCalled();
  });

  it('should return correct hits array', async () => {
    const mockHits = [
      { _id: '1', _index: 'test', fields: { action: 'test' } },
      { _id: '2', _index: 'test', fields: { action: 'test2' } },
    ];

    mockEsClient.search.mockResolvedValue(
      createMockSearchResponse({
        hits: mockHits,
        total: { value: 2, relation: 'eq' },
      })
    );

    const result = await executePitSearch({
      esClient: mockEsClient,
      ...baseParams,
    });

    expect(result.hits).toEqual(mockHits);
  });

  it('should handle ES search errors', async () => {
    const esError = new Error('ES connection failed');
    mockEsClient.search.mockRejectedValue(esError);

    await expect(
      executePitSearch({
        esClient: mockEsClient,
        ...baseParams,
      })
    ).rejects.toThrow('ES connection failed');
  });

  it('should pass kuery filter to buildResultsQuery', async () => {
    mockEsClient.search.mockResolvedValue(createMockSearchResponse());

    await executePitSearch({
      esClient: mockEsClient,
      ...baseParams,
      kuery: 'osquery.action: "executed"',
    });

    expect(mockEsClient.search).toHaveBeenCalled();
  });

  it('should pass startDate filter to buildResultsQuery', async () => {
    mockEsClient.search.mockResolvedValue(createMockSearchResponse());

    await executePitSearch({
      esClient: mockEsClient,
      ...baseParams,
      startDate: '2024-01-01T00:00:00.000Z',
    });

    expect(mockEsClient.search).toHaveBeenCalled();
  });
});
