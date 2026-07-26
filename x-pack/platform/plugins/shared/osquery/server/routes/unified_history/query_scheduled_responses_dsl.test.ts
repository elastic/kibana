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
    test('returns correct structure with spaceId', () => {
      const result = buildScheduledResponsesQuery({ spaceId: defaultSpaceId });

      expect(result).toHaveProperty('body');
      expect(result.body).toHaveProperty('size', 0);
      expect(result.body).toHaveProperty('query');
      expect(result.body).toHaveProperty('aggs');
    });

    test('multi_terms size defaults to 10,000 when no offset/pageSize', () => {
      const result = buildScheduledResponsesQuery({ spaceId: defaultSpaceId });
      const aggs = result.body.aggs as Record<string, unknown>;
      const multiTerms = (aggs.scheduled_executions as Record<string, unknown>)
        .multi_terms as Record<string, unknown>;

      expect(multiTerms.size).toBe(10000);
    });

    test('multi_terms size grows to offset + pageSize + 1 when exceeding 10K', () => {
      const result = buildScheduledResponsesQuery({
        spaceId: defaultSpaceId,
        scheduledOffset: 9990,
        pageSize: 20,
      });
      const aggs = result.body.aggs as Record<string, unknown>;
      const multiTerms = (aggs.scheduled_executions as Record<string, unknown>)
        .multi_terms as Record<string, unknown>;

      expect(multiTerms.size).toBe(10011);
    });

    test('multi_terms size stays at 10K when offset + pageSize + 1 is smaller', () => {
      const result = buildScheduledResponsesQuery({
        spaceId: defaultSpaceId,
        scheduledOffset: 100,
        pageSize: 20,
      });
      const aggs = result.body.aggs as Record<string, unknown>;
      const multiTerms = (aggs.scheduled_executions as Record<string, unknown>)
        .multi_terms as Record<string, unknown>;

      expect(multiTerms.size).toBe(10000);
    });

    test('multi_terms groups by schedule_id and schedule_execution_count', () => {
      const result = buildScheduledResponsesQuery({ spaceId: defaultSpaceId });
      const aggs = result.body.aggs as Record<string, unknown>;
      const multiTerms = (aggs.scheduled_executions as Record<string, unknown>)
        .multi_terms as Record<string, unknown>;

      expect(multiTerms.terms).toEqual([
        { field: 'schedule_id' },
        { field: 'schedule_execution_count' },
      ]);
    });

    test('orders by planned_time descending', () => {
      const result = buildScheduledResponsesQuery({ spaceId: defaultSpaceId });
      const aggs = result.body.aggs as Record<string, unknown>;
      const multiTerms = (aggs.scheduled_executions as Record<string, unknown>)
        .multi_terms as Record<string, unknown>;

      expect(multiTerms.order).toEqual({ planned_time: 'desc' });
    });

    test('includes planned_time sub-aggregation on planned_schedule_time', () => {
      const result = buildScheduledResponsesQuery({ spaceId: defaultSpaceId });
      const aggs = result.body.aggs as Record<string, unknown>;
      const scheduledExec = aggs.scheduled_executions as Record<string, unknown>;
      const subAggs = scheduledExec.aggs as Record<string, unknown>;

      expect(subAggs.planned_time).toEqual({ max: { field: 'planned_schedule_time' } });
    });

    test('includes max_timestamp sub-aggregation for display', () => {
      const result = buildScheduledResponsesQuery({ spaceId: defaultSpaceId });
      const aggs = result.body.aggs as Record<string, unknown>;
      const scheduledExec = aggs.scheduled_executions as Record<string, unknown>;
      const subAggs = scheduledExec.aggs as Record<string, unknown>;

      expect(subAggs.max_timestamp).toEqual({ max: { field: '@timestamp' } });
    });
  });

  describe('base filters', () => {
    test('always includes exists filter on schedule_id', () => {
      const result = buildScheduledResponsesQuery({ spaceId: defaultSpaceId });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ exists: { field: 'schedule_id' } });
    });
  });

  describe('space_id filter', () => {
    test('uses should clause for default space to include docs without space_id', () => {
      const result = buildScheduledResponsesQuery({ spaceId: defaultSpaceId });
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

    test('uses simple term filter for non-default space', () => {
      const result = buildScheduledResponsesQuery({ spaceId: 'security' });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ term: { space_id: 'security' } });
    });
  });

  describe('cursor filter', () => {
    test('adds lte planned_schedule_time filter when cursor is provided', () => {
      const result = buildScheduledResponsesQuery({
        spaceId: defaultSpaceId,
        cursor: '2024-06-01T00:00:00.000Z',
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({
        range: { planned_schedule_time: { lte: '2024-06-01T00:00:00.000Z' } },
      });
    });

    test('does not add cursor filter when cursor is undefined', () => {
      const result = buildScheduledResponsesQuery({ spaceId: defaultSpaceId });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      const rangeFilters = filters.filter(
        (f) => typeof f === 'object' && f !== null && 'range' in f
      );
      expect(rangeFilters).toHaveLength(0);
    });

    test('cursor filter on planned_schedule_time is separate from date range filter on @timestamp', () => {
      const result = buildScheduledResponsesQuery({
        spaceId: defaultSpaceId,
        cursor: '2024-06-15T00:00:00.000Z',
        startDate: '2024-06-01',
        endDate: '2024-06-30',
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      const rangeFilters = filters.filter(
        (f) => typeof f === 'object' && f !== null && 'range' in f
      );
      expect(rangeFilters).toHaveLength(2);
      expect(rangeFilters).toContainEqual({
        range: { planned_schedule_time: { lte: '2024-06-15T00:00:00.000Z' } },
      });
      expect(rangeFilters).toContainEqual({
        range: { '@timestamp': { gte: '2024-06-01', lte: '2024-06-30' } },
      });
    });
  });

  describe('packIds filter', () => {
    test('adds terms filter when packIds is a non-empty array', () => {
      const packIds = ['pack-1', 'pack-2'];
      const result = buildScheduledResponsesQuery({
        spaceId: defaultSpaceId,
        packIds,
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ terms: { pack_id: packIds } });
    });

    test('adds match_none when packIds is empty', () => {
      const result = buildScheduledResponsesQuery({
        spaceId: defaultSpaceId,
        packIds: [],
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ match_none: {} });
    });

    test('does not add packIds filter when packIds is undefined', () => {
      const result = buildScheduledResponsesQuery({
        spaceId: defaultSpaceId,
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toHaveLength(2);
      expect(filters).toContainEqual({ exists: { field: 'schedule_id' } });
      expect(filters).toContainEqual({
        bool: {
          should: [
            { term: { space_id: 'default' } },
            { bool: { must_not: { exists: { field: 'space_id' } } } },
          ],
        },
      });
    });
  });

  describe('scheduleIds filter', () => {
    test('adds terms filter when only scheduleIds is provided', () => {
      const scheduleIds = ['sched-1', 'sched-2'];
      const result = buildScheduledResponsesQuery({
        spaceId: defaultSpaceId,
        scheduleIds,
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ terms: { schedule_id: scheduleIds } });
    });

    test('adds bool should with pack_id and schedule_id when both packIds and scheduleIds provided', () => {
      const packIds = ['pack-1'];
      const scheduleIds = ['sched-1'];
      const result = buildScheduledResponsesQuery({
        spaceId: defaultSpaceId,
        packIds,
        scheduleIds,
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({
        bool: {
          should: [{ terms: { pack_id: packIds } }, { terms: { schedule_id: scheduleIds } }],
          minimum_should_match: 1,
        },
      });
    });

    test('adds match_none when both packIds and scheduleIds are empty', () => {
      const result = buildScheduledResponsesQuery({
        spaceId: defaultSpaceId,
        packIds: [],
        scheduleIds: [],
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ match_none: {} });
    });
  });

  describe('date range filter', () => {
    test('adds timestamp range filter when both startDate and endDate are provided', () => {
      const result = buildScheduledResponsesQuery({
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
  });

  describe('sortDirection', () => {
    test('defaults to desc when not provided', () => {
      const result = buildScheduledResponsesQuery({ spaceId: defaultSpaceId });
      const aggs = result.body.aggs as Record<string, unknown>;
      const multiTerms = (aggs.scheduled_executions as Record<string, unknown>)
        .multi_terms as Record<string, unknown>;

      expect(multiTerms.order).toEqual({ planned_time: 'desc' });
    });

    test('orders ascending when sortDirection is asc', () => {
      const result = buildScheduledResponsesQuery({
        spaceId: defaultSpaceId,
        sortDirection: 'asc',
      });
      const aggs = result.body.aggs as Record<string, unknown>;
      const multiTerms = (aggs.scheduled_executions as Record<string, unknown>)
        .multi_terms as Record<string, unknown>;

      expect(multiTerms.order).toEqual({ planned_time: 'asc' });
    });

    test('cursor filter uses gte when sortDirection is asc', () => {
      const result = buildScheduledResponsesQuery({
        spaceId: defaultSpaceId,
        cursor: '2024-06-01T00:00:00.000Z',
        sortDirection: 'asc',
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({
        range: { planned_schedule_time: { gte: '2024-06-01T00:00:00.000Z' } },
      });
    });

    test('cursor filter uses lte when sortDirection is desc', () => {
      const result = buildScheduledResponsesQuery({
        spaceId: defaultSpaceId,
        cursor: '2024-06-01T00:00:00.000Z',
        sortDirection: 'desc',
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({
        range: { planned_schedule_time: { lte: '2024-06-01T00:00:00.000Z' } },
      });
    });
  });

  describe('combined options', () => {
    test('applies packIds, cursor, and date range filters together', () => {
      const result = buildScheduledResponsesQuery({
        spaceId: defaultSpaceId,
        packIds: ['pack-1', 'pack-2'],
        cursor: '2024-06-15T00:00:00.000Z',
        startDate: 'now-24h',
        endDate: 'now',
      });
      const query = result.body.query as Record<string, unknown>;
      const filters = (query.bool as Record<string, unknown>).filter as unknown[];

      expect(filters).toContainEqual({ terms: { pack_id: ['pack-1', 'pack-2'] } });
      expect(filters).toContainEqual({
        range: { planned_schedule_time: { lte: '2024-06-15T00:00:00.000Z' } },
      });
      expect(filters).toContainEqual({
        range: { '@timestamp': { gte: 'now-24h', lte: 'now' } },
      });
    });
  });
});
