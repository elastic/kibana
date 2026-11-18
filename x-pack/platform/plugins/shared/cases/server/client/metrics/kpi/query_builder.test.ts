/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomKpiMetricConfiguration } from '../../../../common/types/domain';
import { buildForcedFilters, buildKpiMetricSearch, KPI_METRIC_VALUE_AGG } from './query_builder';

const context = { spaceId: 'space-a', owner: 'securitySolution', from: 'now-30d', to: 'now' };

const createMetric = (
  overrides: Partial<CustomKpiMetricConfiguration> = {}
): CustomKpiMetricConfiguration => ({
  id: 'metric-1',
  kind: 'custom',
  label: 'Closed cases',
  index: 'cases',
  query: 'case.status: closed',
  display: 'value',
  ...overrides,
});

const getFilters = (metric: CustomKpiMetricConfiguration) => {
  const { body } = buildKpiMetricSearch(metric, context);
  const filter = body.query?.bool?.filter;
  return Array.isArray(filter) ? filter : [];
};

describe('buildKpiMetricSearch', () => {
  it('puts the space, the owner, the date range, and the KQL in separate filter clauses', () => {
    const filters = getFilters(createMetric());

    expect(filters).toHaveLength(4);
    expect(filters[0]).toEqual({ term: { space_id: 'space-a' } });
    expect(filters[1]).toEqual({ term: { owner: 'securitySolution' } });
    expect(filters[2]).toEqual({
      range: { 'case.created_at': { gte: 'now-30d', lte: 'now' } },
    });
    expect(JSON.stringify(filters[3])).toContain('case.status');
  });

  it('uses @timestamp for the date range of the activity and attachments indices', () => {
    expect(getFilters(createMetric({ index: 'activity', query: '' }))[2]).toEqual({
      range: { '@timestamp': { gte: 'now-30d', lte: 'now' } },
    });
    expect(getFilters(createMetric({ index: 'attachments', query: '' }))[2]).toEqual({
      range: { '@timestamp': { gte: 'now-30d', lte: 'now' } },
    });
  });

  it('keeps the space and owner clauses when the KQL tries to widen the query', () => {
    const filters = getFilters(createMetric({ query: 'space_id: * or owner: *' }));

    expect(filters).toHaveLength(4);
    expect(filters[0]).toEqual({ term: { space_id: 'space-a' } });
    expect(filters[1]).toEqual({ term: { owner: 'securitySolution' } });
    expect(filters[3]).toHaveProperty('bool.should');
  });

  it('throws for an unbalanced KQL query, so it never builds an unfiltered query', () => {
    expect(() =>
      buildKpiMetricSearch(createMetric({ query: 'status: closed or (space_id: *' }), context)
    ).toThrow();
  });

  it('adds the case ids of the list filters as a separate filter clause', () => {
    const { body } = buildKpiMetricSearch(createMetric({ index: 'activity', query: '' }), {
      ...context,
      caseIds: ['case-1', 'case-2'],
    });

    expect(body.query?.bool?.filter).toEqual([
      { term: { space_id: 'space-a' } },
      { term: { owner: 'securitySolution' } },
      { terms: { 'case.id': ['case-1', 'case-2'] } },
      { range: { '@timestamp': { gte: 'now-30d', lte: 'now' } } },
    ]);
  });

  it('matches no document when the list filters match no case', () => {
    const { body } = buildKpiMetricSearch(createMetric({ query: '' }), {
      ...context,
      caseIds: [],
    });

    expect(body.query?.bool?.filter).toEqual(
      expect.arrayContaining([{ terms: { 'case.id': [] } }])
    );
  });

  it('omits the KQL clause for an empty query', () => {
    expect(getFilters(createMetric({ query: '  ' }))).toHaveLength(3);
  });

  it('omits the date range when there is no from and no to', () => {
    const { body } = buildKpiMetricSearch(createMetric({ query: '' }), {
      spaceId: 'space-a',
      owner: 'cases',
    });

    expect(body.query?.bool?.filter).toEqual([
      { term: { space_id: 'space-a' } },
      { term: { owner: 'cases' } },
    ]);
  });

  it('uses the total hits for a count and sets no aggregation', () => {
    const { index, body } = buildKpiMetricSearch(createMetric(), context);

    expect(index).toBe('cases');
    expect(body.size).toBe(0);
    expect(body.track_total_hits).toBe(true);
    expect(body.aggs).toBeUndefined();
  });

  it.each([
    ['sum', { sum: { field: 'case.time_to_resolve' } }],
    ['avg', { avg: { field: 'case.time_to_resolve' } }],
    ['min', { min: { field: 'case.time_to_resolve' } }],
    ['max', { max: { field: 'case.time_to_resolve' } }],
    ['median', { percentiles: { field: 'case.time_to_resolve', percents: [50] } }],
  ] as const)('builds the %s aggregation', (type, expected) => {
    const { body } = buildKpiMetricSearch(
      createMetric({ aggregation: { type, field: 'case.time_to_resolve' } }),
      context
    );

    expect(body.aggs).toEqual({ [KPI_METRIC_VALUE_AGG]: expected });
  });

  it('builds the unique count aggregation', () => {
    const { body } = buildKpiMetricSearch(
      createMetric({ aggregation: { type: 'cardinality', field: 'case.assignees.username' } }),
      context
    );

    expect(body.aggs).toEqual({
      [KPI_METRIC_VALUE_AGG]: { cardinality: { field: 'case.assignees.username' } },
    });
  });

  it('throws for a field that is not in the catalog', () => {
    expect(() =>
      buildKpiMetricSearch(
        createMetric({ aggregation: { type: 'avg', field: 'case.secret' } }),
        context
      )
    ).toThrow('The field case.secret is not allowed for the cases index.');
  });

  describe('percent', () => {
    it('keeps only the forced filters in the query and counts the KQL matches in a filter aggregation', () => {
      const { body } = buildKpiMetricSearch(
        createMetric({ percent: true, query: 'space_id: * or owner: *' }),
        context
      );

      expect(body.query).toEqual({
        bool: {
          filter: [
            { term: { space_id: 'space-a' } },
            { term: { owner: 'securitySolution' } },
            { range: { 'case.created_at': { gte: 'now-30d', lte: 'now' } } },
          ],
        },
      });
      expect(JSON.stringify(body.aggs?.[KPI_METRIC_VALUE_AGG])).toContain('space_id');
      expect(body.aggs?.[KPI_METRIC_VALUE_AGG]).toHaveProperty('filter.bool.filter');
    });

    it('throws for a percent metric with an aggregation', () => {
      expect(() =>
        buildKpiMetricSearch(
          createMetric({
            percent: true,
            aggregation: { type: 'avg', field: 'case.time_to_resolve' },
          }),
          context
        )
      ).toThrow('A percent metric counts the documents');
    });
  });

  describe('date field', () => {
    it('puts the date range on case.closed_at for the closed date', () => {
      expect(getFilters(createMetric({ dateField: 'closed_at' }))[2]).toEqual({
        range: { 'case.closed_at': { gte: 'now-30d', lte: 'now' } },
      });
    });

    it('puts the date range on case.created_at when the metric has no date field', () => {
      expect(getFilters(createMetric())[2]).toEqual({
        range: { 'case.created_at': { gte: 'now-30d', lte: 'now' } },
      });
    });

    it('keeps the forced clauses as separate filter entries with the closed date', () => {
      const { body } = buildKpiMetricSearch(
        createMetric({ dateField: 'closed_at', query: 'space_id: * or owner: *' }),
        { ...context, caseIds: ['case-1'] }
      );
      const filter = body.query?.bool?.filter;
      const filters = Array.isArray(filter) ? filter : [];

      expect(filters).toHaveLength(5);
      expect(filters.slice(0, 4)).toEqual([
        { term: { space_id: 'space-a' } },
        { term: { owner: 'securitySolution' } },
        { terms: { 'case.id': ['case-1'] } },
        { range: { 'case.closed_at': { gte: 'now-30d', lte: 'now' } } },
      ]);
      expect(filters[4]).toHaveProperty('bool.should');
    });

    it('puts case.closed_at in the forced filters of a percent metric', () => {
      const { body } = buildKpiMetricSearch(
        createMetric({ percent: true, dateField: 'closed_at' }),
        context
      );

      expect(body.query).toEqual({
        bool: {
          filter: [
            { term: { space_id: 'space-a' } },
            { term: { owner: 'securitySolution' } },
            { range: { 'case.closed_at': { gte: 'now-30d', lte: 'now' } } },
          ],
        },
      });
    });

    it('throws for a date field on an index that is not the cases index', () => {
      expect(() =>
        buildKpiMetricSearch(createMetric({ index: 'activity', dateField: 'closed_at' }), context)
      ).toThrow('The date field closed_at is not allowed for the activity index.');
    });
  });
});

describe('buildForcedFilters', () => {
  it('uses @timestamp for the attachments index with no date field', () => {
    expect(buildForcedFilters('attachments', context)).toEqual([
      { term: { space_id: 'space-a' } },
      { term: { owner: 'securitySolution' } },
      { range: { '@timestamp': { gte: 'now-30d', lte: 'now' } } },
    ]);
  });
});
