/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Aggregation, Comparator } from './form_types';
import type { ThresholdParams } from './params_schema';
import { thresholdRuleBuilderType } from './definition';

const { build, parse, validate } = thresholdRuleBuilderType;

const baseParams: ThresholdParams = {
  indexPattern: 'logs-*',
  timeField: '@timestamp',
  stats: [{ label: 'count', aggregation: Aggregation.COUNT }],
  evaluations: [],
  alertConditions: [{ metric: 'count', comparator: Comparator.GT, threshold: [100] }],
  conditionOperator: 'AND',
  groupByFields: [],
};

const errorRateParams: ThresholdParams = {
  indexPattern: 'logs-*',
  timeField: 'event.ingested',
  filterQuery: 'service.name == "api"',
  stats: [
    {
      label: 'errors',
      aggregation: Aggregation.COUNT,
      filter: 'http.response.status_code >= 500',
    },
    { label: 'total', aggregation: Aggregation.COUNT },
  ],
  evaluations: [{ label: 'error_rate', expression: 'errors / total * 100' }],
  alertConditions: [{ metric: 'error_rate', comparator: Comparator.GT, threshold: [5] }],
  conditionOperator: 'AND',
  groupByFields: ['service.name'],
  recovery: {
    conditions: [{ metric: 'error_rate', comparator: Comparator.LTE, threshold: [5] }],
    conditionOperator: 'AND',
  },
  severity: {
    mode: 'multi',
    singleLevelSeverity: 'info',
    levels: [
      { severity: 'medium', threshold: 10 },
      { severity: 'critical', threshold: 20 },
    ],
  },
};

describe('thresholdRuleBuilderType', () => {
  describe('build', () => {
    it('splits an alert rule into base and breach segment', () => {
      const {
        query,
        time_field: timeField,
        grouping,
        recovery,
      } = build(baseParams, {
        kind: 'alert',
      });

      expect(query.base).toContain('FROM logs-*');
      expect(query.base).toContain('STATS count = COUNT(*)');
      expect(query.breach?.segment).toContain('WHERE count > 100');
      expect(timeField).toBe('@timestamp');
      expect(grouping).toBeUndefined();
      expect(recovery).toBeUndefined();
    });

    it('keeps the whole query in base for a signal rule and skips recovery', () => {
      const { query, recovery } = build(errorRateParams, { kind: 'signal' });

      expect(query.breach).toBeUndefined();
      expect(query.base).toContain('WHERE error_rate > 5');
      expect(recovery).toBeUndefined();
    });

    it('emits grouping, the time field and a condition recovery for an alert rule', () => {
      const {
        grouping,
        recovery,
        time_field: timeField,
      } = build(errorRateParams, {
        kind: 'alert',
      });

      expect(grouping).toEqual({ fields: ['service.name'] });
      expect(timeField).toBe('event.ingested');
      expect(recovery).toEqual({
        strategy: 'condition',
        segment: expect.stringContaining('WHERE error_rate <= 5'),
      });
    });
  });

  describe('parse', () => {
    it.each([
      ['minimal params', baseParams],
      ['params with every optional section', errorRateParams],
    ])('round-trips %s through build', (_name, params) => {
      const built = build(params, { kind: 'alert' });

      expect(parse(built)).toEqual(params);
    });

    it('returns null for a query the builder did not generate', () => {
      expect(
        parse({ query: { base: 'FROM logs-* | LOOKUP JOIN hosts ON host.name | LIMIT 10' } })
      ).toBeNull();
    });

    it('defaults the time field when the rule does not provide one', () => {
      const { query } = build(baseParams, { kind: 'alert' });

      expect(parse({ query })?.timeField).toBe('@timestamp');
    });

    it('reads a stored breach segment that is blank', () => {
      const { query } = build(baseParams, { kind: 'signal' });

      expect(parse({ query: { ...query, breach: { segment: '' } } })).toEqual(baseParams);
    });
  });

  describe('validate', () => {
    it('accepts valid params', () => {
      expect(validate(baseParams)).toEqual([]);
      expect(validate(errorRateParams)).toEqual([]);
    });

    it('rejects an alert condition on an unknown metric', () => {
      expect(
        validate({
          ...baseParams,
          alertConditions: [{ metric: 'avg_cpu', comparator: Comparator.GT, threshold: [1] }],
        })
      ).toEqual([
        'Alert condition metric "avg_cpu" is not a stat or evaluation label. Available labels: count.',
      ]);
    });

    it('requires two thresholds for range comparators and one otherwise', () => {
      expect(
        validate({
          ...baseParams,
          alertConditions: [
            { metric: 'count', comparator: Comparator.BETWEEN, threshold: [1] },
            { metric: 'count', comparator: Comparator.GT, threshold: [1, 2] },
          ],
        })
      ).toEqual([
        'Alert condition on "count" with comparator "between" needs exactly 2 threshold value(s).',
        'Alert condition on "count" with comparator ">" needs exactly 1 threshold value(s).',
      ]);
    });

    it('checks recovery conditions against the available metrics', () => {
      expect(
        validate({
          ...baseParams,
          recovery: {
            conditions: [{ metric: 'missing', comparator: Comparator.LT, threshold: [1] }],
            conditionOperator: 'AND',
          },
        })
      ).toEqual([
        'Recovery condition metric "missing" is not a stat or evaluation label. Available labels: count.',
      ]);
    });

    it('reports form-level errors such as a missing aggregation field', () => {
      expect(
        validate({
          ...baseParams,
          stats: [{ label: 'avg_cpu', aggregation: Aggregation.AVG }],
          alertConditions: [{ metric: 'avg_cpu', comparator: Comparator.GT, threshold: [1] }],
        })
      ).toEqual([
        'At least one stat is required. Every stat needs a label, and every aggregation other than count needs a field.',
      ]);
    });
  });
});
