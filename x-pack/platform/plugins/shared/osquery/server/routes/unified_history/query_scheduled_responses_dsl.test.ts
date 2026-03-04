/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildScheduledResponsesQuery } from './query_scheduled_responses_dsl';

describe('buildScheduledResponsesQuery', () => {
  const defaultSpaceId = 'default';

  describe('base structure', () => {
    test('returns correct structure with pageSize and spaceId', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20, spaceId: defaultSpaceId });

      expect(result).toHaveProperty('body');
      expect(result.body).toHaveProperty('size', 0);
      expect(result.body).toHaveProperty('query');
      expect(result.body).toHaveProperty('aggs');
    });

    test('body size is always 0 — aggregation only, no hits returned', () => {
      expect(
        buildScheduledResponsesQuery({ pageSize: 10, spaceId: defaultSpaceId }).body.size
      ).toBe(0);
      expect(
        buildScheduledResponsesQuery({ pageSize: 100, spaceId: defaultSpaceId }).body.size
      ).toBe(0);
    });

    test('multi_terms size uses a minimum of 10,000 to support large deployments within a time window', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 25, spaceId: defaultSpaceId });
      const aggs = result.body.aggs as Record<string, unknown>;
      const multiTerms = (aggs.scheduled_executions as Record<string, unknown>)
        .multi_terms as Record<string, unknown>;

      expect(multiTerms.size).toBe(10000);
    });

    test('multi_terms size uses pageSize when it exceeds the minimum', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20000, spaceId: defaultSpaceId });
      const aggs = result.body.aggs as Record<string, unknown>;
      const multiTerms = (aggs.scheduled_executions as Record<string, unknown>)
        .multi_terms as Record<string, unknown>;

      expect(multiTerms.size).toBe(20000);
    });

    test('multi_terms orders by max_timestamp descending', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20, spaceId: defaultSpaceId });
      const aggs = result.body.aggs as Record<string, unknown>;
      const multiTerms = (aggs.scheduled_executions as Record<string, unknown>)
        .multi_terms as Record<string, unknown>;

      expect(multiTerms.order).toEqual({ max_timestamp: 'desc' });
    });

    test('multi_terms groups by schedule_id and schedule_execution_count', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20, spaceId: defaultSpaceId });
      const aggs = result.body.aggs as Record<string, unknown>;
      const multiTerms = (aggs.scheduled_executions as Record<string, unknown>)
        .multi_terms as Record<string, unknown>;

      expect(multiTerms.terms).toEqual([
        { field: 'schedule_id' },
        { field: 'schedule_execution_count' },
      ]);
    });

    test('sub-aggregations include max_timestamp, agent_count, total_rows, success_count, and error_count', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20, spaceId: defaultSpaceId });
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

  describe('base filters', () => {
    test('always includes exists filter on schedule_id', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20, spaceId: defaultSpaceId });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ exists: { field: 'schedule_id' } });
    });

    // TODO(osquery-space-aware-scheduled-responses): add space_id filter assertions
    // when response documents start containing space_id (elastic/security-team#16172)

    test('exists filter is the first element in the filter array', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20, spaceId: defaultSpaceId });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters[0]).toEqual({ exists: { field: 'schedule_id' } });
    });
  });

  describe('cursor filter', () => {
    test('adds timestamp range filter when cursor is provided', () => {
      const cursor = '2024-01-15T10:00:00.000Z';
      const result = buildScheduledResponsesQuery({
        pageSize: 20,
        spaceId: defaultSpaceId,
        cursor,
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({
        range: { '@timestamp': { lte: cursor } },
      });
    });

    test('does not add timestamp range filter when cursor is undefined', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20, spaceId: defaultSpaceId });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      const rangeFilter = filters.find((f) => (f as Record<string, unknown>).range !== undefined);
      expect(rangeFilter).toBeUndefined();
    });
  });

  describe('scheduleIds filter', () => {
    test('adds terms filter when scheduleIds is a non-empty array', () => {
      const scheduleIds = ['id-1', 'id-2', 'id-3'];
      const result = buildScheduledResponsesQuery({
        pageSize: 20,
        spaceId: defaultSpaceId,
        scheduleIds,
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ terms: { schedule_id: scheduleIds } });
    });

    test('adds match-none equivalent when scheduleIds is an empty array', () => {
      // An empty scheduleIds array means the search term matched no pack queries,
      // so no scheduled results should be returned. The implementation signals this
      // with a match_none filter.
      const result = buildScheduledResponsesQuery({
        pageSize: 20,
        spaceId: defaultSpaceId,
        scheduleIds: [],
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ match_none: {} });
    });

    test('does not add a scheduleIds filter when scheduleIds is undefined', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20, spaceId: defaultSpaceId });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      const termsFilter = filters.find((f) => (f as Record<string, unknown>).terms !== undefined);
      expect(termsFilter).toBeUndefined();
    });

    test('single scheduleId is passed through as a terms array', () => {
      const result = buildScheduledResponsesQuery({
        pageSize: 20,
        spaceId: defaultSpaceId,
        scheduleIds: ['only-one'],
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ terms: { schedule_id: ['only-one'] } });
    });
  });

  describe('date range filter', () => {
    test('adds timestamp range filter when both startDate and endDate are provided', () => {
      const result = buildScheduledResponsesQuery({
        pageSize: 20,
        spaceId: defaultSpaceId,
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
      const result = buildScheduledResponsesQuery({
        pageSize: 20,
        spaceId: defaultSpaceId,
        startDate: 'now-7d',
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({
        range: { '@timestamp': { gte: 'now-7d' } },
      });
    });

    test('adds only lte when only endDate is provided', () => {
      const result = buildScheduledResponsesQuery({
        pageSize: 20,
        spaceId: defaultSpaceId,
        endDate: 'now',
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({
        range: { '@timestamp': { lte: 'now' } },
      });
    });

    test('does not add date range filter when neither startDate nor endDate is provided', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20, spaceId: defaultSpaceId });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toHaveLength(1); // exists only (space_id deferred)
    });
  });

  describe('combined options', () => {
    test('includes cursor and scheduleIds filters alongside base filters', () => {
      const cursor = '2024-06-01T00:00:00.000Z';
      const scheduleIds = ['abc', 'def'];
      const result = buildScheduledResponsesQuery({
        pageSize: 10,
        spaceId: defaultSpaceId,
        cursor,
        scheduleIds,
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ exists: { field: 'schedule_id' } });
      expect(filters).toContainEqual({ terms: { schedule_id: scheduleIds } });
      expect(filters).toContainEqual({ range: { '@timestamp': { lte: cursor } } });
      expect(filters).toHaveLength(3);
    });

    test('only base filters are present when no optional params are provided', () => {
      const result = buildScheduledResponsesQuery({ pageSize: 20, spaceId: defaultSpaceId });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toHaveLength(1);
      expect(filters[0]).toEqual({ exists: { field: 'schedule_id' } });
    });
  });
});
