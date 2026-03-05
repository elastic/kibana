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

    test('sort is by @timestamp descending', () => {
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default' });
      const sort = result.body.sort as unknown[];

      expect(sort).toEqual([{ '@timestamp': { order: 'desc' } }]);
    });

    test('_source is always true', () => {
      expect(buildLiveActionsQuery({ pageSize: 20, spaceId: 'default' }).body._source).toBe(true);
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

    test('INPUT_ACTION and osquery filters are the first two elements', () => {
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default' });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters[0]).toEqual({ term: { type: { value: 'INPUT_ACTION' } } });
      expect(filters[1]).toEqual({ term: { input_type: { value: 'osquery' } } });
    });
  });

  describe('space_id filter', () => {
    test('default space uses a should clause that matches explicit default or missing space_id', () => {
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

    test('non-default space uses a simple term filter for space_id', () => {
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'my-space' });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ term: { space_id: 'my-space' } });
    });

    test('non-default space does not include the should clause with missing space_id', () => {
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'my-space' });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      const shouldFilter = filters.find((f) => {
        const filter = f as Record<string, unknown>;

        return (
          filter.bool !== undefined && (filter.bool as Record<string, unknown>).should !== undefined
        );
      });
      expect(shouldFilter).toBeUndefined();
    });

    test('default space does not include a plain term space_id filter', () => {
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default' });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      const plainTermFilter = filters.find((f) => {
        const filter = f as Record<string, unknown>;

        return (
          filter.term !== undefined &&
          (filter.term as Record<string, unknown>).space_id !== undefined
        );
      });
      expect(plainTermFilter).toBeUndefined();
    });
  });

  describe('cursor filter', () => {
    test('adds timestamp range filter when cursor is provided', () => {
      const cursor = '2024-03-20T12:00:00.000Z';
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default', cursor });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({
        range: { '@timestamp': { lt: cursor } },
      });
    });

    test('does not add timestamp range filter when cursor is undefined', () => {
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default' });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      const rangeFilter = filters.find((f) => (f as Record<string, unknown>).range !== undefined);
      expect(rangeFilter).toBeUndefined();
    });
  });

  describe('kuery filter', () => {
    test('adds simple_query_string filter when kuery is provided', () => {
      const result = buildLiveActionsQuery({
        pageSize: 20,
        spaceId: 'default',
        kuery: 'myquery',
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({
        simple_query_string: {
          query: '*myquery*',
          fields: ['pack_name', 'queries.query', 'queries.id'],
          analyze_wildcard: true,
        },
      });
    });

    test('wraps the kuery value with leading and trailing wildcards', () => {
      const result = buildLiveActionsQuery({
        pageSize: 20,
        spaceId: 'default',
        kuery: 'find-me',
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      const qsFilter = filters.find(
        (f) => (f as Record<string, unknown>).simple_query_string !== undefined
      ) as Record<string, unknown>;
      const qs = qsFilter.simple_query_string as Record<string, unknown>;

      expect(qs.query).toBe('*find-me*');
    });

    test('searches across pack_name, queries.query, and queries.id fields', () => {
      const result = buildLiveActionsQuery({
        pageSize: 20,
        spaceId: 'default',
        kuery: 'x',
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      const qsFilter = filters.find(
        (f) => (f as Record<string, unknown>).simple_query_string !== undefined
      ) as Record<string, unknown>;
      const qs = qsFilter.simple_query_string as Record<string, unknown>;

      expect(qs.fields).toEqual(['pack_name', 'queries.query', 'queries.id']);
    });

    test('sets analyze_wildcard to true on the simple_query_string filter', () => {
      const result = buildLiveActionsQuery({
        pageSize: 20,
        spaceId: 'default',
        kuery: 'x',
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      const qsFilter = filters.find(
        (f) => (f as Record<string, unknown>).simple_query_string !== undefined
      ) as Record<string, unknown>;
      const qs = qsFilter.simple_query_string as Record<string, unknown>;

      expect(qs.analyze_wildcard).toBe(true);
    });

    test('does not add simple_query_string filter when kuery is undefined', () => {
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default' });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      const qsFilter = filters.find(
        (f) => (f as Record<string, unknown>).simple_query_string !== undefined
      );
      expect(qsFilter).toBeUndefined();
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

    test('adds only gte when only startDate is provided', () => {
      const result = buildLiveActionsQuery({
        pageSize: 20,
        spaceId: 'default',
        startDate: 'now-7d',
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({
        range: { '@timestamp': { gte: 'now-7d' } },
      });
    });

    test('does not add date range filter when neither startDate nor endDate is provided', () => {
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default' });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      // base filters only: type, input_type, space_id
      expect(filters).toHaveLength(3);
    });
  });

  describe('combined options', () => {
    test('includes all optional filters when cursor, kuery, and non-default spaceId are provided', () => {
      const cursor = '2024-06-01T00:00:00.000Z';
      const result = buildLiveActionsQuery({
        pageSize: 10,
        spaceId: 'custom-space',
        cursor,
        kuery: 'test',
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      // base: type, input_type, space_id term, range, simple_query_string = 5
      expect(filters).toHaveLength(5);
      expect(filters).toContainEqual({ term: { type: { value: 'INPUT_ACTION' } } });
      expect(filters).toContainEqual({ term: { input_type: { value: 'osquery' } } });
      expect(filters).toContainEqual({ term: { space_id: 'custom-space' } });
      expect(filters).toContainEqual({ range: { '@timestamp': { lt: cursor } } });
      const qsFilter = filters.find(
        (f) => (f as Record<string, unknown>).simple_query_string !== undefined
      );
      expect(qsFilter).toBeDefined();
    });

    test('base filter count is 3 when only required params are provided for default space', () => {
      // type + input_type + default-space should clause
      const result = buildLiveActionsQuery({ pageSize: 20, spaceId: 'default' });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toHaveLength(3);
    });
  });
});
