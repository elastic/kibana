/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildScheduledActionResultsQuery } from './query.scheduled_action_results.dsl';
import { Direction } from '../../../../../common/search_strategy';

describe('buildScheduledActionResultsQuery', () => {
  const defaultOptions = {
    scheduleId: 'test-schedule-id',
    executionCount: 42,
    sort: { field: '@timestamp', direction: Direction.desc },
    pagination: { activePage: 0, cursorStart: 0, querySize: 20 },
    factoryQueryType: 'scheduledActionResults',
  };

  it('filters by schedule_id and schedule_execution_count', () => {
    const result = buildScheduledActionResultsQuery(defaultOptions as any);

    expect(result.query).toEqual({
      bool: {
        filter: [
          { term: { schedule_id: 'test-schedule-id' } },
          { term: { schedule_execution_count: 42 } },
        ],
      },
    });
  });

  it('queries the action responses data stream index', () => {
    const result = buildScheduledActionResultsQuery(defaultOptions as any);

    expect(result.index).toContain('logs-osquery_manager.action.responses');
  });

  it('includes aggregations for success/error counts and rows', () => {
    const result = buildScheduledActionResultsQuery(defaultOptions as any);
    const aggs = result.aggs as any;

    expect(aggs.aggs.aggs.responses_by_schedule).toBeDefined();
    expect(aggs.aggs.aggs.responses_by_schedule.aggs.rows_count).toEqual({
      sum: { field: 'action_response.osquery.count' },
    });
    expect(aggs.aggs.aggs.responses_by_schedule.aggs.responses).toBeDefined();
  });

  it('applies pagination correctly', () => {
    const options = {
      ...defaultOptions,
      pagination: { activePage: 2, cursorStart: 0, querySize: 10 },
    };

    const result = buildScheduledActionResultsQuery(options as any);

    expect(result.from).toBe(20);
    expect(result.size).toBe(10);
  });

  it('sorts by specified field and direction', () => {
    const options = {
      ...defaultOptions,
      sort: { field: 'agent.id', direction: Direction.asc },
    };

    const result = buildScheduledActionResultsQuery(options as any);

    expect(result.sort).toEqual([{ 'agent.id': { order: 'asc' } }]);
  });

  it('includes space_id filter when spaceId is provided', () => {
    const options = { ...defaultOptions, spaceId: 'my-space' };

    const result = buildScheduledActionResultsQuery(options as any);

    expect(result.query).toEqual({
      bool: {
        filter: [
          { term: { schedule_id: 'test-schedule-id' } },
          { term: { schedule_execution_count: 42 } },
          { term: { space_id: 'my-space' } },
        ],
      },
    });

    const aggs = result.aggs as any;
    const mustFilters = aggs.aggs.aggs.responses_by_schedule.filter.bool.must;
    expect(mustFilters).toContainEqual({ term: { space_id: 'my-space' } });
  });

  it('omits space_id filter when spaceId is not provided', () => {
    const result = buildScheduledActionResultsQuery(defaultOptions as any);
    const filterQuery = result.query as any;
    const filters = filterQuery.bool.filter;
    const hasSpaceFilter = filters.some(
      (f) => f.term && Object.prototype.hasOwnProperty.call(f.term, 'space_id')
    );

    expect(hasSpaceFilter).toBe(false);
  });
});
