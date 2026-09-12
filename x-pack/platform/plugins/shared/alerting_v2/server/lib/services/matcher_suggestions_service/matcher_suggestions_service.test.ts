/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsFindResponse } from '@kbn/core/server';
import {
  createMockEsClient,
  createMockSavedObjectsClient,
  createRuleSoAttributes,
} from '../../test_utils';
import type { RuleSavedObjectAttributes } from '../../../saved_objects';
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

describe('MatcherSuggestionsService.getSuggestions (saved-object-backed fields)', () => {
  let esClient: ReturnType<typeof createMockEsClient>;
  let soClient: ReturnType<typeof createMockSavedObjectsClient>;
  let service: MatcherSuggestionsService;

  const buildFindResponse = (
    attributesList: Array<Partial<RuleSavedObjectAttributes>>,
    ids?: string[]
  ): SavedObjectsFindResponse<RuleSavedObjectAttributes> => ({
    total: attributesList.length,
    per_page: attributesList.length,
    page: 1,
    saved_objects: attributesList.map((attributes, i) => ({
      id: ids?.[i] ?? `rule-${i}`,
      type: 'alerting_v2_rule',
      attributes: createRuleSoAttributes(attributes),
      references: [],
      score: 0,
    })),
  });

  beforeEach(() => {
    jest.resetAllMocks();
    esClient = createMockEsClient();
    soClient = createMockSavedObjectsClient();
    service = new MatcherSuggestionsService(soClient, esClient);
  });

  describe('rule.name', () => {
    it('sorts by the managed updated_at root field, not the camelCase updatedAt', async () => {
      soClient.find.mockResolvedValue(buildFindResponse([{ metadata: { name: 'My rule' } }]));

      await service.getSuggestions('rule.name', 'My');

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: 'updated_at', sortOrder: 'desc' })
      );
    });

    it('scopes the search to metadata.name when a query is provided', async () => {
      soClient.find.mockResolvedValue(buildFindResponse([{ metadata: { name: 'My rule' } }]));

      await service.getSuggestions('rule.name', 'My');

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'My*', searchFields: ['metadata.name'] })
      );
    });

    it('omits the search clause when no query is provided', async () => {
      soClient.find.mockResolvedValue(buildFindResponse([{ metadata: { name: 'My rule' } }]));

      await service.getSuggestions('rule.name', '');

      const params = soClient.find.mock.calls[0][0];
      expect(params).not.toHaveProperty('search');
      expect(params).not.toHaveProperty('searchFields');
    });

    it('maps results to the rule name attribute', async () => {
      soClient.find.mockResolvedValue(
        buildFindResponse([{ metadata: { name: 'Rule A' } }, { metadata: { name: 'Rule B' } }])
      );

      const result = await service.getSuggestions('rule.name', '');

      expect(result).toEqual(['Rule A', 'Rule B']);
    });
  });

  describe('rule.tags', () => {
    it('sorts by the managed updated_at root field', async () => {
      soClient.find.mockResolvedValue(buildFindResponse([{ metadata: { name: 'r', tags: [] } }]));

      await service.getSuggestions('rule.tags', '');

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: 'updated_at', sortOrder: 'desc' })
      );
    });

    it('collects, dedupes, sorts, and prefix-filters tags across rules', async () => {
      soClient.find.mockResolvedValue(
        buildFindResponse([
          { metadata: { name: 'r1', tags: ['prod', 'team-a'] } },
          { metadata: { name: 'r2', tags: ['prod', 'preview'] } },
        ])
      );

      const result = await service.getSuggestions('rule.tags', 'pr');

      expect(result).toEqual(['preview', 'prod']);
    });
  });

  describe('rule.id', () => {
    it('sorts by the managed updated_at root field', async () => {
      soClient.find.mockResolvedValue(buildFindResponse([{}], ['abc']));

      await service.getSuggestions('rule.id', '');

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: 'updated_at', sortOrder: 'desc' })
      );
    });

    it('maps to saved object ids and prefix-filters by query', async () => {
      soClient.find.mockResolvedValue(buildFindResponse([{}, {}], ['abc-1', 'xyz-2']));

      const result = await service.getSuggestions('rule.id', 'abc');

      expect(result).toEqual(['abc-1']);
    });
  });
});
