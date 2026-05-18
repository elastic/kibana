/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlQuery } from './esql_builder';
import { Aggregation, Comparator, type ThresholdRuleFormValues } from './types';

const baseValues: ThresholdRuleFormValues = {
  kind: 'alert',
  metadata: { name: 'test', description: '', tags: [] },
  indexPattern: 'logs-*',
  timeField: '@timestamp',
  stats: [],
  evaluations: [],
  alertConditions: [],
  conditionOperator: 'AND',
  groupBy: [],
  schedule: { every: '1m', lookback: '5m' },
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
};

describe('buildEsqlQuery', () => {
  it('returns empty string when indexPattern is empty', () => {
    expect(buildEsqlQuery({ ...baseValues, indexPattern: '' })).toBe('');
  });

  it('returns a LIMIT query when no stats are complete', () => {
    expect(buildEsqlQuery(baseValues)).toBe('FROM logs-*\n| LIMIT 10');
  });

  it('generates a COUNT stat', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      stats: [{ id: '1', label: 'A', aggregation: Aggregation.COUNT }],
      alertConditions: [{ id: 'c1', metric: 'A', comparator: Comparator.GT, threshold: [100] }],
    });

    expect(result).toBe('FROM logs-*\n| STATS A = COUNT(*)\n| WHERE A > 100');
  });

  it('generates an AVG stat with a field', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      stats: [{ id: '1', label: 'avg_cpu', aggregation: Aggregation.AVG, field: 'cpu.usage' }],
      alertConditions: [
        { id: 'c1', metric: 'avg_cpu', comparator: Comparator.GTE, threshold: [0.9] },
      ],
    });

    expect(result).toBe('FROM logs-*\n| STATS avg_cpu = AVG(cpu.usage)\n| WHERE avg_cpu >= 0.9');
  });

  it('generates BETWEEN condition', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      stats: [{ id: '1', label: 'total_bytes', aggregation: Aggregation.SUM, field: 'bytes' }],
      alertConditions: [
        { id: 'c1', metric: 'total_bytes', comparator: Comparator.BETWEEN, threshold: [100, 500] },
      ],
    });

    expect(result).toContain('| WHERE total_bytes >= 100 AND total_bytes <= 500');
  });

  it('generates NOT_BETWEEN condition', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      stats: [{ id: '1', label: 'max_rt', aggregation: Aggregation.MAX, field: 'response_time' }],
      alertConditions: [
        { id: 'c1', metric: 'max_rt', comparator: Comparator.NOT_BETWEEN, threshold: [50, 200] },
      ],
    });

    expect(result).toContain('(max_rt < 50 OR max_rt > 200)');
  });

  it('combines multiple alert conditions with AND', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      conditionOperator: 'AND',
      stats: [
        { id: '1', label: 'A', aggregation: Aggregation.COUNT },
        { id: '2', label: 'B', aggregation: Aggregation.AVG, field: 'cpu' },
      ],
      alertConditions: [
        { id: 'c1', metric: 'A', comparator: Comparator.GT, threshold: [100] },
        { id: 'c2', metric: 'B', comparator: Comparator.GT, threshold: [0.8] },
      ],
    });

    expect(result).toContain('| STATS A = COUNT(*), B = AVG(cpu)');
    expect(result).toContain('| WHERE A > 100 AND B > 0.8');
  });

  it('combines multiple alert conditions with OR', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      conditionOperator: 'OR',
      stats: [
        { id: '1', label: 'A', aggregation: Aggregation.COUNT },
        { id: '2', label: 'B', aggregation: Aggregation.MIN, field: 'latency' },
      ],
      alertConditions: [
        { id: 'c1', metric: 'A', comparator: Comparator.GT, threshold: [100] },
        { id: 'c2', metric: 'B', comparator: Comparator.LT, threshold: [10] },
      ],
    });

    expect(result).toContain('| WHERE A > 100 OR B < 10');
  });

  it('includes GROUP BY when groupBy fields are set', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      groupBy: ['host.name', 'service.name'],
      stats: [{ id: '1', label: 'A', aggregation: Aggregation.COUNT }],
      alertConditions: [{ id: 'c1', metric: 'A', comparator: Comparator.GT, threshold: [50] }],
    });

    expect(result).toContain('BY host.name, service.name');
  });

  it('skips incomplete stats (missing field for non-count agg)', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      stats: [{ id: '1', label: 'A', aggregation: Aggregation.AVG }],
    });

    expect(result).toBe('FROM logs-*\n| LIMIT 10');
  });

  it('handles CARDINALITY aggregation (COUNT_DISTINCT)', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      stats: [
        { id: '1', label: 'unique_users', aggregation: Aggregation.CARDINALITY, field: 'user.id' },
      ],
    });

    expect(result).toContain('COUNT_DISTINCT(user.id)');
  });

  it('handles P95 aggregation (PERCENTILE)', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      stats: [{ id: '1', label: 'p95_lat', aggregation: Aggregation.P95, field: 'latency' }],
    });

    expect(result).toContain('PERCENTILE(latency, 95)');
  });

  it('handles P99 aggregation (PERCENTILE)', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      stats: [{ id: '1', label: 'p99_lat', aggregation: Aggregation.P99, field: 'latency' }],
      alertConditions: [
        { id: 'c1', metric: 'p99_lat', comparator: Comparator.LTE, threshold: [1000] },
      ],
    });

    expect(result).toContain('PERCENTILE(latency, 99)');
    expect(result).toContain('<= 1000');
  });

  it('escapes field names with special characters', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      stats: [{ id: '1', label: 'A', aggregation: Aggregation.AVG, field: 'my-field' }],
    });

    expect(result).toContain('`my-field`');
  });

  it('includes global filter as WHERE clause before STATS', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      filterQuery: 'status >= 400',
      stats: [{ id: '1', label: 'A', aggregation: Aggregation.COUNT }],
      alertConditions: [{ id: 'c1', metric: 'A', comparator: Comparator.GT, threshold: [10] }],
    });

    expect(result).toBe('FROM logs-*\n| WHERE status >= 400\n| STATS A = COUNT(*)\n| WHERE A > 10');
  });

  it('includes global filter in fallback query when no stats', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      filterQuery: 'service.name == "web"',
    });

    expect(result).toBe('FROM logs-*\n| WHERE service.name == "web"\n| LIMIT 10');
  });

  it('includes per-stat filter in aggregation expression', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      stats: [
        { id: '1', label: 'errors', aggregation: Aggregation.COUNT, filter: 'status >= 500' },
      ],
    });

    expect(result).toContain('errors = COUNT(*) WHERE status >= 500');
  });

  it('generates EVAL lines for evaluations', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      stats: [
        { id: '1', label: 'errors', aggregation: Aggregation.COUNT, filter: 'status >= 500' },
        { id: '2', label: 'total', aggregation: Aggregation.COUNT },
      ],
      evaluations: [{ id: 'e1', label: 'error_rate', expression: 'errors / total * 100' }],
      alertConditions: [
        { id: 'c1', metric: 'error_rate', comparator: Comparator.GT, threshold: [5] },
      ],
    });

    expect(result).toContain('| STATS errors = COUNT(*) WHERE status >= 500, total = COUNT(*)');
    expect(result).toContain('| EVAL error_rate = errors / total * 100');
    expect(result).toContain('| WHERE error_rate > 5');
  });

  it('handles multiple evaluations', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      stats: [
        { id: '1', label: 'A', aggregation: Aggregation.COUNT },
        { id: '2', label: 'B', aggregation: Aggregation.SUM, field: 'bytes' },
      ],
      evaluations: [
        { id: 'e1', label: 'avg_size', expression: 'B / A' },
        { id: 'e2', label: 'avg_size_kb', expression: 'avg_size / 1024' },
      ],
      alertConditions: [
        { id: 'c1', metric: 'avg_size_kb', comparator: Comparator.GT, threshold: [100] },
      ],
    });

    expect(result).toContain('| EVAL avg_size = B / A');
    expect(result).toContain('| EVAL avg_size_kb = avg_size / 1024');
    expect(result).toContain('| WHERE avg_size_kb > 100');
  });

  it('skips incomplete evaluations', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      stats: [{ id: '1', label: 'A', aggregation: Aggregation.COUNT }],
      evaluations: [
        { id: 'e1', label: 'rate', expression: '' },
        { id: 'e2', label: '', expression: 'A * 2' },
      ],
    });

    expect(result).not.toContain('EVAL');
  });

  it('omits WHERE line when no alert conditions', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      stats: [{ id: '1', label: 'A', aggregation: Aggregation.COUNT }],
    });

    expect(result).toBe('FROM logs-*\n| STATS A = COUNT(*)');
  });

  it('ignores empty/whitespace-only filter strings', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      filterQuery: '   ',
      stats: [{ id: '1', label: 'A', aggregation: Aggregation.COUNT, filter: '  ' }],
      alertConditions: [{ id: 'c1', metric: 'A', comparator: Comparator.GT, threshold: [10] }],
    });

    expect(result).toBe('FROM logs-*\n| STATS A = COUNT(*)\n| WHERE A > 10');
  });

  it('combines global filter, per-stat filter, evaluations, and alert conditions', () => {
    const result = buildEsqlQuery({
      ...baseValues,
      filterQuery: 'service.name == "api"',
      stats: [
        { id: '1', label: 'errors', aggregation: Aggregation.COUNT, filter: 'status >= 500' },
        { id: '2', label: 'total', aggregation: Aggregation.COUNT },
      ],
      evaluations: [{ id: 'e1', label: 'error_rate', expression: 'errors / total * 100' }],
      alertConditions: [
        { id: 'c1', metric: 'error_rate', comparator: Comparator.GT, threshold: [5] },
      ],
      groupBy: ['host.name'],
    });

    const lines = result.split('\n');
    expect(lines[0]).toBe('FROM logs-*');
    expect(lines[1]).toBe('| WHERE service.name == "api"');
    expect(lines[2]).toContain('| STATS');
    expect(lines[2]).toContain('errors = COUNT(*) WHERE status >= 500');
    expect(lines[2]).toContain('total = COUNT(*)');
    expect(lines[2]).toContain('BY host.name');
    expect(lines[3]).toBe('| EVAL error_rate = errors / total * 100');
    expect(lines[4]).toBe('| WHERE error_rate > 5');
  });
});
