/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatExecutionTrendsResult,
  getExecutionTrendsAggregation,
  getExecutionTrendsInterval,
} from './get_execution_trends_aggregation';

const start = new Date('2024-01-01T00:00:00.000Z');
const end = new Date('2024-01-02T00:00:00.000Z');

describe('getExecutionTrendsInterval', () => {
  it.each([
    [15 * 60_000, '1m'],
    [60 * 60_000, '5m'],
    [24 * 60 * 60_000, '30m'],
    [6 * 24 * 60 * 60_000, '3h'],
    [7 * 24 * 60 * 60_000, '12h'],
    [90 * 24 * 60 * 60_000, '7d'],
    [10 * 365 * 24 * 60 * 60_000, '7d'],
  ])('picks an interval for a %d ms range', (rangeMs, expected) => {
    expect(getExecutionTrendsInterval(start, new Date(start.getTime() + rangeMs))).toBe(expected);
  });
});

describe('getExecutionTrendsAggregation', () => {
  it('builds a histogram, failing-rule and slowest-rule aggregation', () => {
    const { interval, aggs } = getExecutionTrendsAggregation({ start, end, topRulesSize: 3 });

    expect(interval).toBe('30m');
    expect(aggs).toEqual({
      ruleExecution: {
        filter: {
          bool: {
            must: [
              {
                bool: {
                  must: [
                    { match: { 'event.action': 'execute' } },
                    { match: { 'event.provider': 'alerting' } },
                  ],
                },
              },
            ],
          },
        },
        aggs: {
          byTime: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '30m',
              min_doc_count: 0,
              extended_bounds: { min: start.toISOString(), max: end.toISOString() },
            },
            aggs: {
              outcomes: {
                multi_terms: {
                  size: 10,
                  terms: [
                    { field: 'kibana.alerting.outcome', missing: '' },
                    { field: 'event.outcome' },
                  ],
                },
              },
              avgDuration: { avg: { field: 'event.duration' } },
            },
          },
          topFailingRules: {
            filter: {
              bool: {
                should: [
                  { term: { 'kibana.alerting.outcome': 'failure' } },
                  { term: { 'event.outcome': 'failure' } },
                ],
                minimum_should_match: 1,
              },
            },
            aggs: {
              byRule: {
                terms: { field: 'rule.id', size: 3 },
                aggs: {
                  ruleName: { terms: { field: 'rule.name', size: 1 } },
                  lastFailure: { max: { field: '@timestamp' } },
                },
              },
            },
          },
          slowestRules: {
            terms: { field: 'rule.id', size: 3, order: { avgDuration: 'desc' } },
            aggs: {
              ruleName: { terms: { field: 'rule.name', size: 1 } },
              avgDuration: { avg: { field: 'event.duration' } },
            },
          },
        },
      },
    });
  });

  it('applies a KQL filter', () => {
    const { aggs } = getExecutionTrendsAggregation({
      start,
      end,
      filter: 'kibana.alert.rule.rule_type_id: foo',
    });

    expect(aggs.ruleExecution.filter?.bool).toHaveProperty('filter');
  });

  it('throws on an invalid filter', () => {
    expect(() =>
      getExecutionTrendsAggregation({ start, end, filter: 'kibana.alert.rule.rule_type_id: (' })
    ).toThrow('Invalid kuery syntax');
  });
});

describe('formatExecutionTrendsResult', () => {
  it('returns an empty result when there are no aggregations', () => {
    expect(formatExecutionTrendsResult('1h', { aggregations: undefined })).toEqual({
      interval: '1h',
      buckets: [],
      topFailingRules: [],
      slowestRules: [],
    });
  });

  it('formats buckets, failing and slowest rules', () => {
    const result = formatExecutionTrendsResult('30m', {
      aggregations: {
        ruleExecution: {
          doc_count: 7,
          byTime: {
            buckets: [
              {
                key: 1704067200000,
                key_as_string: '2024-01-01T00:00:00.000Z',
                doc_count: 5,
                outcomes: {
                  buckets: [
                    { key: ['success', 'success'], doc_count: 2 },
                    { key: ['failure', 'failure'], doc_count: 1 },
                    { key: ['warning', 'success'], doc_count: 1 },
                    { key: ['', 'success'], doc_count: 1 },
                  ],
                },
                avgDuration: { value: 2_500_000 },
              },
              {
                key: 1704069000000,
                key_as_string: '2024-01-01T00:30:00.000Z',
                doc_count: 0,
                outcomes: { buckets: [] },
                avgDuration: { value: null },
              },
            ],
          },
          topFailingRules: {
            doc_count: 1,
            byRule: {
              buckets: [
                {
                  key: 'rule-1',
                  doc_count: 1,
                  ruleName: { buckets: [{ key: 'Rule one', doc_count: 1 }] },
                  lastFailure: {
                    value: 1704067200000,
                    value_as_string: '2024-01-01T00:00:00.000Z',
                  },
                },
              ],
            },
          },
          slowestRules: {
            buckets: [
              {
                key: 'rule-2',
                doc_count: 3,
                ruleName: { buckets: [] },
                avgDuration: { value: 10_000_000 },
              },
            ],
          },
        },
      } as never,
    });

    expect(result).toEqual({
      interval: '30m',
      buckets: [
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          total: 5,
          success: 3,
          failure: 1,
          warning: 1,
          unknown: 0,
          avgDurationMs: 3,
        },
        {
          timestamp: '2024-01-01T00:30:00.000Z',
          total: 0,
          success: 0,
          failure: 0,
          warning: 0,
          unknown: 0,
          avgDurationMs: 0,
        },
      ],
      topFailingRules: [
        { id: 'rule-1', name: 'Rule one', failures: 1, lastFailure: '2024-01-01T00:00:00.000Z' },
      ],
      slowestRules: [{ id: 'rule-2', name: '', executions: 3, avgDurationMs: 10 }],
    });
  });
});
