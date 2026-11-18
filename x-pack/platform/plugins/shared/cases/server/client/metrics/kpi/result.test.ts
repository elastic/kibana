/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { KPI_METRIC_MISSING_AGG, KPI_METRIC_VALUE_AGG } from './query_builder';
import {
  getKpiMetricFormat,
  mapKpiSearchResponse,
  readKpiBreakdown,
  readKpiMetricValue,
} from './result';

const createResponse = (
  aggregate?: estypes.AggregationsAggregate
): estypes.MsearchMultiSearchItem => ({
  took: 1,
  timed_out: false,
  status: 200,
  _shards: { total: 1, successful: 1, failed: 0 },
  hits: { total: { value: 4, relation: 'eq' }, hits: [] },
  ...(aggregate != null && { aggregations: { [KPI_METRIC_VALUE_AGG]: aggregate } }),
});

describe('getKpiMetricFormat', () => {
  it('returns number for a count and a unique count', () => {
    expect(getKpiMetricFormat({ index: 'cases' })).toBe('number');
    expect(
      getKpiMetricFormat({
        index: 'cases',
        aggregation: { type: 'cardinality', field: 'case.assignees.username' },
      })
    ).toBe('number');
  });

  it('returns duration for a field in seconds', () => {
    expect(
      getKpiMetricFormat({
        index: 'cases',
        aggregation: { type: 'median', field: 'case.time_to_resolve' },
      })
    ).toBe('duration');
  });

  it('returns number for a numeric field with no unit', () => {
    expect(
      getKpiMetricFormat({
        index: 'cases',
        aggregation: { type: 'sum', field: 'case.total_alerts' },
      })
    ).toBe('number');
  });
});

describe('readKpiMetricValue', () => {
  it('reads the total hits for a count', () => {
    expect(readKpiMetricValue({}, createResponse())).toBe(4);
  });

  it('reads the value of a single value aggregation', () => {
    expect(
      readKpiMetricValue(
        { aggregation: { type: 'avg', field: 'case.time_to_resolve' } },
        createResponse({ value: 120 })
      )
    ).toBe(120);
  });

  it('returns null when the aggregation has no value', () => {
    expect(
      readKpiMetricValue(
        { aggregation: { type: 'avg', field: 'case.time_to_resolve' } },
        createResponse({ value: null })
      )
    ).toBeNull();
  });

  it('reads the 50th percentile for a median', () => {
    expect(
      readKpiMetricValue(
        { aggregation: { type: 'median', field: 'case.time_to_resolve' } },
        createResponse({ values: { '50.0': 300 } })
      )
    ).toBe(300);
  });

  describe('percent', () => {
    it('returns percent as the format', () => {
      expect(getKpiMetricFormat({ index: 'cases', percent: true })).toBe('percent');
    });

    it('divides the KQL matches by all documents', () => {
      expect(readKpiMetricValue({ percent: true }, createResponse({ doc_count: 1 }))).toBe(25);
    });

    it('returns null when there are no documents', () => {
      const response = {
        ...createResponse({ doc_count: 0 }),
        hits: { total: { value: 0, relation: 'eq' as const }, hits: [] },
      };

      expect(readKpiMetricValue({ percent: true }, response)).toBeNull();
    });
  });
});

describe('breakdown', () => {
  const breakdownResponse: estypes.MsearchMultiSearchItem = {
    ...createResponse(),
    hits: { total: { value: 42, relation: 'eq' }, hits: [] },
    aggregations: {
      [KPI_METRIC_VALUE_AGG]: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 3,
        buckets: [
          { key: 'critical', doc_count: 12 },
          { key: 'high', doc_count: 10 },
        ],
      },
      [KPI_METRIC_MISSING_AGG]: { doc_count: 2 },
    },
  };

  it('maps the buckets, the total, the other count, and the missing count', () => {
    expect(readKpiBreakdown(breakdownResponse)).toEqual({
      total: 42,
      buckets: [
        { key: 'critical', count: 12 },
        { key: 'high', count: 10 },
      ],
      otherCount: 3,
      missingCount: 2,
    });
  });

  it('gives 0 for the other and the missing count when the aggregations are missing', () => {
    expect(readKpiBreakdown(createResponse())).toEqual({
      total: 4,
      buckets: [],
      otherCount: 0,
      missingCount: 0,
    });
  });

  it('maps a breakdown metric to a breakdown result', () => {
    expect(
      mapKpiSearchResponse(
        {
          id: 'metric-1',
          kind: 'custom',
          label: 'Cases by severity',
          index: 'cases',
          query: '',
          display: 'value',
          groupBy: { field: 'case.severity' },
        },
        breakdownResponse
      )
    ).toEqual({
      id: 'metric-1',
      type: 'breakdown',
      field: 'case.severity',
      total: 42,
      buckets: [
        { key: 'critical', count: 12 },
        { key: 'high', count: 10 },
      ],
      otherCount: 3,
      missingCount: 2,
    });
  });
});
