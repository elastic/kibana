/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getBreachEsqlQuery,
  getRecoverEsqlQuery,
  validateEsqlQuery,
} from '@kbn/alerting-v2-schemas';
import { BuilderQueryGenerationError } from '../errors';
import { generateThresholdQuery } from './generate_query';
import { Aggregation, Comparator, type ThresholdBuilderFields } from './types';

const baseFields = (overrides: Partial<ThresholdBuilderFields> = {}): ThresholdBuilderFields => ({
  indexPattern: 'logs-*',
  timeField: '@timestamp',
  stats: [{ label: 'count', aggregation: Aggregation.COUNT }],
  evaluations: [],
  alertConditions: [{ metric: 'count', comparator: Comparator.GT, threshold: [100] }],
  conditionOperator: 'AND',
  groupByFields: [],
  ...overrides,
});

// Numeric thresholds render through the ES|QL decimal literal builder, so an
// integer bound prints as `100.0`. Kept identical to the client-side generator
// this replaces: regenerating an existing rule must not rewrite its query.
describe('generateThresholdQuery', () => {
  it('generates a composed query with the breach condition in its own segment', () => {
    const { query } = generateThresholdQuery(baseFields());

    expect(query).toEqual({
      format: 'composed',
      base: 'FROM logs-*\n  | STATS count = COUNT(*)',
      breach: { segment: '| WHERE count > 100.0' },
    });
  });

  it('carries the time field through and omits grouping when there are no group-by fields', () => {
    const generated = generateThresholdQuery(baseFields({ timeField: 'event.ingested' }));

    expect(generated.time_field).toBe('event.ingested');
    expect(generated.grouping).toBeUndefined();
  });

  it('derives grouping from the group-by fields', () => {
    const generated = generateThresholdQuery(
      baseFields({ groupByFields: ['host.name', 'service.name'] })
    );

    expect(generated.grouping).toEqual({ fields: ['host.name', 'service.name'] });
    expect(generated.query.format === 'composed' && generated.query.base).toContain(
      'BY host.name, service.name'
    );
  });

  it('applies the global filter before STATS', () => {
    const { query } = generateThresholdQuery(baseFields({ filterQuery: 'service.name == "api"' }));

    expect(query.format === 'composed' && query.base).toBe(
      'FROM logs-*\n  | WHERE service.name == "api"\n  | STATS count = COUNT(*)'
    );
  });

  it('keeps a per-stat inline WHERE unparenthesized', () => {
    const { query } = generateThresholdQuery(
      baseFields({
        stats: [
          { label: 'errors', aggregation: Aggregation.COUNT, filter: 'status >= 500' },
          { label: 'total', aggregation: Aggregation.COUNT },
        ],
        alertConditions: [{ metric: 'errors', comparator: Comparator.GT, threshold: [10] }],
      })
    );

    expect(query.format === 'composed' && query.base).toContain(
      'STATS errors = COUNT(*) WHERE status >= 500, total = COUNT(*)'
    );
  });

  it('emits EVAL commands for derived metrics', () => {
    const { query } = generateThresholdQuery(
      baseFields({
        stats: [
          { label: 'errors', aggregation: Aggregation.COUNT, filter: 'status >= 500' },
          { label: 'total', aggregation: Aggregation.COUNT },
        ],
        evaluations: [{ label: 'error_rate', expression: 'errors / total * 100' }],
        alertConditions: [{ metric: 'error_rate', comparator: Comparator.GT, threshold: [5] }],
      })
    );

    expect(query.format === 'composed' && query.base).toContain(
      '| EVAL error_rate = errors / total * 100'
    );
    expect(query.format === 'composed' && query.breach?.segment).toBe('| WHERE error_rate > 5.0');
  });

  it('maps aggregations to their ES|QL functions', () => {
    const { query } = generateThresholdQuery(
      baseFields({
        stats: [
          { label: 'avg_latency', aggregation: Aggregation.AVG, field: 'latency' },
          { label: 'unique_hosts', aggregation: Aggregation.CARDINALITY, field: 'host.name' },
          { label: 'p95_latency', aggregation: Aggregation.P95, field: 'latency' },
          { label: 'p99_latency', aggregation: Aggregation.P99, field: 'latency' },
        ],
        alertConditions: [{ metric: 'avg_latency', comparator: Comparator.GT, threshold: [1] }],
      })
    );

    const base = query.format === 'composed' ? query.base : '';
    expect(base).toContain('avg_latency = AVG(latency)');
    expect(base).toContain('unique_hosts = COUNT_DISTINCT(host.name)');
    expect(base).toContain('p95_latency = PERCENTILE(latency, 95)');
    expect(base).toContain('p99_latency = PERCENTILE(latency, 99)');
  });

  it('escapes labels and fields that are not bare ES|QL identifiers', () => {
    const { query } = generateThresholdQuery(
      baseFields({
        stats: [{ label: 'my count', aggregation: Aggregation.COUNT }],
        alertConditions: [{ metric: 'my count', comparator: Comparator.GT, threshold: [1] }],
      })
    );

    expect(query.format === 'composed' && query.base).toContain('`my count` = COUNT(*)');
  });

  describe('comparators', () => {
    it.each([
      [Comparator.GT, [5], '| WHERE count > 5.0'],
      [Comparator.GTE, [5], '| WHERE count >= 5.0'],
      [Comparator.LT, [5], '| WHERE count < 5.0'],
      [Comparator.LTE, [5], '| WHERE count <= 5.0'],
    ])('renders %s', (comparator, threshold, expected) => {
      const { query } = generateThresholdQuery(
        baseFields({ alertConditions: [{ metric: 'count', comparator, threshold }] })
      );

      expect(query.format === 'composed' && query.breach?.segment).toBe(expected);
    });

    it('expands between into an inclusive range', () => {
      const { query } = generateThresholdQuery(
        baseFields({
          alertConditions: [
            { metric: 'count', comparator: Comparator.BETWEEN, threshold: [10, 20] },
          ],
        })
      );

      expect(query.format === 'composed' && query.breach?.segment).toBe(
        '| WHERE count >= 10.0 AND count <= 20.0'
      );
    });

    it('expands not_between into an exclusive range', () => {
      const { query } = generateThresholdQuery(
        baseFields({
          alertConditions: [
            { metric: 'count', comparator: Comparator.NOT_BETWEEN, threshold: [10, 20] },
          ],
        })
      );

      expect(query.format === 'composed' && query.breach?.segment).toBe(
        '| WHERE count < 10.0 OR count > 20.0'
      );
    });
  });

  it('joins multiple alert conditions with the configured operator', () => {
    const fields = baseFields({
      stats: [
        { label: 'count', aggregation: Aggregation.COUNT },
        { label: 'avg_latency', aggregation: Aggregation.AVG, field: 'latency' },
      ],
      alertConditions: [
        { metric: 'count', comparator: Comparator.GT, threshold: [100] },
        { metric: 'avg_latency', comparator: Comparator.GT, threshold: [500] },
      ],
    });

    const segmentFor = (conditionOperator: 'AND' | 'OR') => {
      const { query } = generateThresholdQuery({ ...fields, conditionOperator });
      return query.format === 'composed' ? query.breach?.segment : undefined;
    };

    expect(segmentFor('AND')).toBe('| WHERE count > 100.0 AND avg_latency > 500.0');
    expect(segmentFor('OR')).toBe('| WHERE count > 100.0 OR avg_latency > 500.0');
  });

  describe('recovery', () => {
    it('adds a recovery segment when recovery conditions are present', () => {
      const { query } = generateThresholdQuery(
        baseFields({
          recovery: {
            conditions: [{ metric: 'count', comparator: Comparator.LTE, threshold: [100] }],
            conditionOperator: 'AND',
          },
        })
      );

      expect(query.format === 'composed' && query.recovery).toEqual({
        segment: '| WHERE count <= 100.0',
      });
    });

    it('omits the recovery segment when there are no recovery conditions', () => {
      const { query } = generateThresholdQuery(
        baseFields({ recovery: { conditions: [], conditionOperator: 'AND' } })
      );

      expect(query.format === 'composed' && query.recovery).toBeUndefined();
    });
  });

  describe('generated queries are valid ES|QL', () => {
    it('composes base + breach into a parseable query', () => {
      const { query } = generateThresholdQuery(
        baseFields({
          filterQuery: 'service.name == "api"',
          stats: [
            { label: 'errors', aggregation: Aggregation.COUNT, filter: 'status >= 500' },
            { label: 'total', aggregation: Aggregation.COUNT },
          ],
          evaluations: [{ label: 'error_rate', expression: 'errors / total * 100' }],
          alertConditions: [{ metric: 'error_rate', comparator: Comparator.GT, threshold: [5] }],
          groupByFields: ['host.name'],
        })
      );

      expect(validateEsqlQuery(getBreachEsqlQuery(query))).toBeUndefined();
    });

    it('composes base + recovery into a parseable query', () => {
      const { query } = generateThresholdQuery(
        baseFields({
          recovery: {
            conditions: [{ metric: 'count', comparator: Comparator.LTE, threshold: [100] }],
            conditionOperator: 'AND',
          },
        })
      );

      expect(validateEsqlQuery(getRecoverEsqlQuery(query, 'query')!)).toBeUndefined();
    });
  });

  it('is deterministic', () => {
    const fields = baseFields({
      filterQuery: 'service.name == "api"',
      evaluations: [{ label: 'doubled', expression: 'count * 2' }],
      groupByFields: ['host.name'],
    });

    expect(generateThresholdQuery(fields)).toEqual(generateThresholdQuery(fields));
  });

  describe('unparseable fragments', () => {
    it('throws rather than dropping an invalid global filter', () => {
      expect(() => generateThresholdQuery(baseFields({ filterQuery: 'service.name ===' }))).toThrow(
        BuilderQueryGenerationError
      );
    });

    it('reports which evaluation failed', () => {
      expect(() =>
        generateThresholdQuery(
          baseFields({ evaluations: [{ label: 'bad', expression: 'count +' }] })
        )
      ).toThrow(expect.objectContaining({ path: 'evaluations[0].expression' }));
    });
  });
});
