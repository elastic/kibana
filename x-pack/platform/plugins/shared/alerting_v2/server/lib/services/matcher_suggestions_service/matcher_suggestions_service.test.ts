/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { createMockEsClient, createMockSavedObjectsClient } from '../../test_utils';
import { MatcherSuggestionsService } from './matcher_suggestions_service';

const buildSearchResponse = (
  hits: Array<{ data: Record<string, unknown> }>
): SearchResponse<unknown> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    total: { value: hits.length, relation: 'eq' },
    max_score: null,
    hits: hits.map((source, i) => ({
      _index: '.internal.alerts-default',
      _id: String(i),
      _score: null,
      _source: source,
    })),
  },
});

describe('MatcherSuggestionsService.getDataFieldNames', () => {
  let esClient: ReturnType<typeof createMockEsClient>;
  let soClient: ReturnType<typeof createMockSavedObjectsClient>;
  let service: MatcherSuggestionsService;

  const getSearchFilters = (): QueryDslQueryContainer[] => {
    const args = esClient.search.mock.calls[0];
    if (!args) throw new Error('esClient.search was not called');
    const params = args[0];
    if (!params) throw new Error('esClient.search was called with no params');
    const query = params.query as { bool: { filter: QueryDslQueryContainer[] } };
    return query.bool.filter;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    esClient = createMockEsClient();
    soClient = createMockSavedObjectsClient();
    service = new MatcherSuggestionsService(soClient, esClient);
  });

  it('queries with the original four filter clauses when no matcher is provided', async () => {
    esClient.search.mockResolvedValue(buildSearchResponse([{ data: { 'host.name': 'a' } }]));

    await service.getDataFieldNames();

    const filters = getSearchFilters();
    expect(filters).toHaveLength(4);
  });

  it('appends matcher-derived filters to bool.filter when a valid matcher is provided', async () => {
    esClient.search.mockResolvedValue(buildSearchResponse([{ data: { 'host.name': 'a' } }]));

    await service.getDataFieldNames('rule.id : "abc"');

    const filters = getSearchFilters();
    expect(filters.length).toBeGreaterThan(4);
    expect(JSON.stringify(filters)).toContain('rule.id');
    expect(JSON.stringify(filters)).toContain('abc');
  });

  it('falls back to the original four filters when the matcher is malformed', async () => {
    esClient.search.mockResolvedValue(buildSearchResponse([{ data: { 'host.name': 'a' } }]));

    await service.getDataFieldNames('rule.id :');

    const filters = getSearchFilters();
    expect(filters).toHaveLength(4);
  });

  it('falls back to the original four filters when every matcher clause is unsupported', async () => {
    esClient.search.mockResolvedValue(buildSearchResponse([{ data: { 'host.name': 'a' } }]));

    await service.getDataFieldNames('rule.tags : "x"');

    const filters = getSearchFilters();
    expect(filters).toHaveLength(4);
  });

  it('flattens, dedupes, sorts, and prefixes the data field names from response hits', async () => {
    esClient.search.mockResolvedValue(
      buildSearchResponse([
        { data: { host: { name: 'a' }, count: 1 } },
        { data: { host: { name: 'b' }, count: 2 } },
      ])
    );

    const result = await service.getDataFieldNames();

    expect(result).toEqual(['data.count', 'data.host.name']);
  });

  it('returns [] when ES throws index_not_found_exception', async () => {
    esClient.search.mockRejectedValue({
      meta: { body: { error: { type: 'index_not_found_exception' } } },
    });

    const result = await service.getDataFieldNames();

    expect(result).toEqual([]);
  });

  it('rethrows non-index-not-found errors', async () => {
    const error = new Error('boom');
    esClient.search.mockRejectedValue(error);

    await expect(service.getDataFieldNames()).rejects.toBe(error);
  });
});
