/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildLiveActionsQuery } from './query_live_actions_dsl';

describe('buildLiveActionsQuery', () => {
  describe('base structure', () => {
    test('returns correct base structure with required params only', () => {
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default' });

      expect(result).toHaveProperty('body');
      expect(result.body).toHaveProperty('query');
      expect(result.body).toHaveProperty('size', 20);
      expect(result.body).toHaveProperty('sort');
      expect(result.body).toHaveProperty('_source', true);
    });

    test('size equals pageSize', () => {
      expect(buildLiveActionsQuery({ pageSize: 10, spaceId: 'default' }).body.size).toBe(10);
      expect(buildLiveActionsQuery({ pageSize: 50, spaceId: 'default' }).body.size).toBe(50);
    });

    test('sort is by @timestamp desc with _shard_doc asc tiebreaker', () => {
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default' });
      const sort = result.body.sort as unknown[];

      expect(sort).toEqual([{ '@timestamp': { order: 'desc' } }, { _shard_doc: { order: 'asc' } }]);
    });
  });

  describe('base filters', () => {
    test('always includes INPUT_ACTION type filter', () => {
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default' });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ term: { type: { value: 'INPUT_ACTION' } } });
    });

    test('always includes osquery input_type filter', () => {
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default' });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ term: { input_type: { value: 'osquery' } } });
    });
  });

  describe('space_id filter', () => {
    test('default space uses a should clause', () => {
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default' });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({
        bool: {
          should: [
            { term: { space_id: 'default' } },
            { bool: { must_not: { exists: { field: 'space_id' } } } },
          ],
        },
      });
    });

    test('non-default space uses a simple term filter', () => {
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'my-space' });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ term: { space_id: 'my-space' } });
    });
  });

  describe('search_after', () => {
    test('adds search_after to body when searchAfter is provided', () => {
      const searchAfter = [1710936000000, 42];
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default', searchAfter });

      expect(result.body.search_after).toEqual([1710936000000, 42]);
    });

    test('does not add search_after when searchAfter is undefined', () => {
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default' });

      expect(result.body).not.toHaveProperty('search_after');
    });

    test('does not add range filter for cursor', () => {
      const searchAfter = [1710936000000, 42];
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default', searchAfter });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      const rangeFilters = filters.filter(
        (f) => typeof f === 'object' && f !== null && 'range' in f
      );
      expect(rangeFilters).toHaveLength(0);
    });
  });

  describe('kuery filter', () => {
    test('adds simple_query_string filter when kuery is provided', () => {
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default', kuery: 'myquery' });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({
        simple_query_string: {
          query: 'myquery*',
          fields: ['pack_name', 'queries.query', 'queries.id'],
          analyze_wildcard: true,
        },
      });
    });
  });

  describe('date range filter', () => {
    test('adds timestamp range filter when both startDate and endDate are provided', () => {
      const result = buildLiveActionsQuery({
        pageSize: 20,
        spaceId: 'default',
        startDate: 'now-24h',
        endDate: 'now',
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({
        range: { '@timestamp': { gte: 'now-24h', lte: 'now' } },
      });
    });
  });

  describe('combined options', () => {
    test('applies searchAfter, kuery, and date range together', () => {
      const result = buildLiveActionsQuery({
        pageSize: 20,
        spaceId: 'default',
        searchAfter: [1710936000000, 42],
        kuery: 'myquery',
        startDate: 'now-24h',
        endDate: 'now',
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(result.body.search_after).toEqual([1710936000000, 42]);
      expect(filters).toContainEqual({
        simple_query_string: {
          query: 'myquery*',
          fields: ['pack_name', 'queries.query', 'queries.id'],
          analyze_wildcard: true,
        },
      });
      expect(filters).toContainEqual({
        range: { '@timestamp': { gte: 'now-24h', lte: 'now' } },
      });
    });
  });
});
