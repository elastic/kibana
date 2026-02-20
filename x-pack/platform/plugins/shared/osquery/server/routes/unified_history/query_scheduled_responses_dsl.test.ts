/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildScheduledResponsesQuery } from './query_scheduled_responses_dsl';

describe('buildScheduledResponsesQuery', () => {
  describe('base structure', () => {
    test('returns correct structure with only pageSize provided', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20 });

      expect(result).toHaveProperty('body');
      expect(result.body).toHaveProperty('size', 0);
      expect(result.body).toHaveProperty('query');
      expect(result.body).toHaveProperty('aggs');
    });

    test('body size is always 0 — aggregation only, no hits returned', () => {
      expect(buildScheduledResponsesQuery({ pageSize: 10 }).body.size).toBe(0);
      expect(buildScheduledResponsesQuery({ pageSize: 100 }).body.size).toBe(0);
    });

    test('multi_terms size uses a minimum of 1000 to avoid timestamp-collision pagination gaps', () => {
      // When pageSize is small (e.g. 25), the aggregation fetches at least 1000 buckets
      // so that concurrent executions sharing the same timestamp are not silently dropped.
      const result = buildScheduledResponsesQuery({ pageSize: 25 });
      const aggs = result.body.aggs as Record<string, unknown>;
      const multiTerms = (aggs.scheduled_executions as Record<string, unknown>)
        .multi_terms as Record<string, unknown>;

      expect(multiTerms.size).toBe(1000);
    });

    test('multi_terms size uses pageSize when it exceeds the minimum', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 2000 });
      const aggs = result.body.aggs as Record<string, unknown>;
      const multiTerms = (aggs.scheduled_executions as Record<string, unknown>)
        .multi_terms as Record<string, unknown>;

      expect(multiTerms.size).toBe(2000);
    });

    test('multi_terms orders by max_timestamp descending', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20 });
      const aggs = result.body.aggs as Record<string, unknown>;
      const multiTerms = (aggs.scheduled_executions as Record<string, unknown>)
        .multi_terms as Record<string, unknown>;

      expect(multiTerms.order).toEqual({ max_timestamp: 'desc' });
    });

    test('multi_terms groups by schedule_id and schedule_execution_count', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20 });
      const aggs = result.body.aggs as Record<string, unknown>;
      const multiTerms = (aggs.scheduled_executions as Record<string, unknown>)
        .multi_terms as Record<string, unknown>;

      expect(multiTerms.terms).toEqual([
        { field: 'schedule_id' },
        { field: 'schedule_execution_count' },
      ]);
    });

    test('sub-aggregations include max_timestamp, agent_count, total_rows, success_count, and error_count', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20 });
      const aggs = result.body.aggs as Record<string, unknown>;
      const subAggs = (aggs.scheduled_executions as Record<string, unknown>).aggs as Record<
        string,
        unknown
      >;

      expect(subAggs).toHaveProperty('max_timestamp');
      expect(subAggs).toHaveProperty('agent_count');
      expect(subAggs).toHaveProperty('total_rows');
      expect(subAggs).toHaveProperty('success_count');
      expect(subAggs).toHaveProperty('error_count');
    });
  });

  describe('base filter', () => {
    test('always includes exists filter on schedule_id', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20 });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ exists: { field: 'schedule_id' } });
    });

    test('base filter is the first element in the filter array', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20 });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters[0]).toEqual({ exists: { field: 'schedule_id' } });
    });
  });

  describe('cursor filter', () => {
    test('adds timestamp range filter when cursor is provided', () => {
      const cursor = '2024-01-15T10:00:00.000Z';
      const result = buildScheduledResponsesQuery({ pageSize: 20, cursor });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({
        range: { '@timestamp': { lte: cursor } },
      });
    });

    test('does not add timestamp range filter when cursor is undefined', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20 });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      const rangeFilter = filters.find(
        (f) => (f as Record<string, unknown>).range !== undefined
      );
      expect(rangeFilter).toBeUndefined();
    });
  });

  describe('scheduleIds filter', () => {
    test('adds terms filter when scheduleIds is a non-empty array', () => {
      const scheduleIds = ['id-1', 'id-2', 'id-3'];
      const result = buildScheduledResponsesQuery({ pageSize: 20, scheduleIds });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ terms: { schedule_id: scheduleIds } });
    });

    test('adds match-none equivalent when scheduleIds is an empty array', () => {
      // An empty scheduleIds array means the search term matched no pack queries,
      // so no scheduled results should be returned. The implementation signals this
      // with a bool.must_not.match_all filter.
      const result = buildScheduledResponsesQuery({ pageSize: 20, scheduleIds: [] });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ bool: { must_not: { match_all: {} } } });
    });

    test('does not add a scheduleIds filter when scheduleIds is undefined', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20 });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      const termsFilter = filters.find(
        (f) => (f as Record<string, unknown>).terms !== undefined
      );
      expect(termsFilter).toBeUndefined();
    });

    test('single scheduleId is passed through as a terms array', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20, scheduleIds: ['only-one'] });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ terms: { schedule_id: ['only-one'] } });
    });
  });

  describe('combined options', () => {
    test('includes both cursor and scheduleIds filters when both are provided', () => {
      const cursor = '2024-06-01T00:00:00.000Z';
      const scheduleIds = ['abc', 'def'];
      const result = buildScheduledResponsesQuery({ pageSize: 10, cursor, scheduleIds });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ exists: { field: 'schedule_id' } });
      expect(filters).toContainEqual({ terms: { schedule_id: scheduleIds } });
      expect(filters).toContainEqual({ range: { '@timestamp': { lte: cursor } } });
      expect(filters).toHaveLength(3);
    });

    test('only the base filter is present when no optional params are provided', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20 });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toHaveLength(1);
      expect(filters[0]).toEqual({ exists: { field: 'schedule_id' } });
    });
  });
});
