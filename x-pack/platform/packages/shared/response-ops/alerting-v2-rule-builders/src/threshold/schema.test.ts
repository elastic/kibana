/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_CONDITIONS, MAX_EXPRESSION_LENGTH, MAX_LABEL_LENGTH, MAX_STATS } from './constants';
import { thresholdBuilderFieldsSchema } from './schema';
import { Aggregation, Comparator, type ThresholdBuilderFields } from './types';

const validFields = (overrides: Partial<ThresholdBuilderFields> = {}): ThresholdBuilderFields => ({
  indexPattern: 'logs-*',
  timeField: '@timestamp',
  stats: [{ label: 'count', aggregation: Aggregation.COUNT }],
  evaluations: [],
  alertConditions: [{ metric: 'count', comparator: Comparator.GT, threshold: [100] }],
  conditionOperator: 'AND',
  groupByFields: [],
  ...overrides,
});

/** Collects the dot-joined paths of every issue so assertions can target one field. */
const issuePaths = (fields: unknown): string[] => {
  const result = thresholdBuilderFieldsSchema.safeParse(fields);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

const expectValid = (fields: unknown) =>
  expect(thresholdBuilderFieldsSchema.safeParse(fields).success).toBe(true);

const expectInvalid = (fields: unknown) =>
  expect(thresholdBuilderFieldsSchema.safeParse(fields).success).toBe(false);

describe('thresholdBuilderFieldsSchema', () => {
  it('accepts a minimal valid payload', () => {
    expectValid(validFields());
  });

  it('accepts a fully populated payload', () => {
    expectValid(
      validFields({
        filterQuery: 'service.name == "api"',
        stats: [
          { label: 'errors', aggregation: Aggregation.COUNT, filter: 'status >= 500' },
          { label: 'total', aggregation: Aggregation.COUNT },
          { label: 'p95', aggregation: Aggregation.P95, field: 'latency' },
        ],
        evaluations: [{ label: 'error_rate', expression: 'errors / total * 100' }],
        alertConditions: [{ metric: 'error_rate', comparator: Comparator.GT, threshold: [5] }],
        groupByFields: ['host.name'],
        recovery: {
          conditions: [{ metric: 'error_rate', comparator: Comparator.LTE, threshold: [1] }],
          conditionOperator: 'AND',
        },
      })
    );
  });

  it('rejects unknown properties', () => {
    expectInvalid({ ...validFields(), somethingElse: true });
  });

  describe('required fields', () => {
    it.each(['indexPattern', 'timeField', 'stats', 'alertConditions', 'conditionOperator'])(
      'rejects a payload missing %s',
      (field) => {
        const fields: Record<string, unknown> = { ...validFields() };
        delete fields[field];
        expectInvalid(fields);
      }
    );

    it('rejects an empty index pattern', () => {
      expectInvalid(validFields({ indexPattern: '' }));
    });

    it('rejects an empty stats array', () => {
      expectInvalid(validFields({ stats: [] }));
    });

    it('rejects an empty alertConditions array', () => {
      expectInvalid(validFields({ alertConditions: [] }));
    });
  });

  describe('bounds', () => {
    it('rejects an over-long index pattern', () => {
      expectInvalid(validFields({ indexPattern: 'a'.repeat(513) }));
    });

    it('rejects an over-long label', () => {
      expectInvalid(
        validFields({
          stats: [{ label: 'a'.repeat(MAX_LABEL_LENGTH + 1), aggregation: Aggregation.COUNT }],
        })
      );
    });

    it('rejects an over-long expression', () => {
      expectInvalid(validFields({ filterQuery: 'a'.repeat(MAX_EXPRESSION_LENGTH + 1) }));
    });

    it('rejects more than the maximum number of stats', () => {
      expectInvalid(
        validFields({
          stats: Array.from({ length: MAX_STATS + 1 }, (_, i) => ({
            label: `count_${i}`,
            aggregation: Aggregation.COUNT,
          })),
        })
      );
    });

    it('rejects more than the maximum number of conditions', () => {
      expectInvalid(
        validFields({
          alertConditions: Array.from({ length: MAX_CONDITIONS + 1 }, () => ({
            metric: 'count',
            comparator: Comparator.GT,
            threshold: [1],
          })),
        })
      );
    });
  });

  describe('aggregation field requirement', () => {
    it.each([
      Aggregation.AVG,
      Aggregation.SUM,
      Aggregation.MIN,
      Aggregation.MAX,
      Aggregation.CARDINALITY,
      Aggregation.P95,
      Aggregation.P99,
    ])('requires field for %s', (aggregation) => {
      expect(issuePaths(validFields({ stats: [{ label: 'metric', aggregation }] }))).toContain(
        'stats.0.field'
      );
    });

    it('does not require field for count', () => {
      expectValid(validFields({ stats: [{ label: 'count', aggregation: Aggregation.COUNT }] }));
    });

    it('rejects an unknown aggregation', () => {
      expectInvalid(validFields({ stats: [{ label: 'x', aggregation: 'median' as Aggregation }] }));
    });
  });

  describe('threshold arity', () => {
    it.each([Comparator.GT, Comparator.GTE, Comparator.LT, Comparator.LTE])(
      'requires exactly one bound for %s',
      (comparator) => {
        expectValid(
          validFields({ alertConditions: [{ metric: 'count', comparator, threshold: [1] }] })
        );
        expectInvalid(
          validFields({ alertConditions: [{ metric: 'count', comparator, threshold: [1, 2] }] })
        );
      }
    );

    it.each([Comparator.BETWEEN, Comparator.NOT_BETWEEN])(
      'requires exactly two bounds for %s',
      (comparator) => {
        expectValid(
          validFields({ alertConditions: [{ metric: 'count', comparator, threshold: [1, 2] }] })
        );
        expectInvalid(
          validFields({ alertConditions: [{ metric: 'count', comparator, threshold: [1] }] })
        );
      }
    );

    it('rejects an inverted range', () => {
      expect(
        issuePaths(
          validFields({
            alertConditions: [
              { metric: 'count', comparator: Comparator.BETWEEN, threshold: [20, 10] },
            ],
          })
        )
      ).toContain('alertConditions.0.threshold');
    });

    it('rejects a non-finite threshold', () => {
      expectInvalid(
        validFields({
          alertConditions: [{ metric: 'count', comparator: Comparator.GT, threshold: [Infinity] }],
        })
      );
    });
  });

  describe('label references', () => {
    it('rejects duplicate labels across stats and evaluations', () => {
      expectInvalid(
        validFields({
          stats: [
            { label: 'count', aggregation: Aggregation.COUNT },
            { label: 'count', aggregation: Aggregation.SUM, field: 'bytes' },
          ],
        })
      );

      expectInvalid(
        validFields({
          evaluations: [{ label: 'count', expression: 'count * 2' }],
        })
      );
    });

    it('rejects a condition referencing an undeclared metric', () => {
      expect(
        issuePaths(
          validFields({
            alertConditions: [{ metric: 'nope', comparator: Comparator.GT, threshold: [1] }],
          })
        )
      ).toContain('alertConditions.0.metric');
    });

    it('rejects a recovery condition referencing an undeclared metric', () => {
      expect(
        issuePaths(
          validFields({
            recovery: {
              conditions: [{ metric: 'nope', comparator: Comparator.LTE, threshold: [1] }],
              conditionOperator: 'AND',
            },
          })
        )
      ).toContain('recovery.conditions.0.metric');
    });

    it('accepts a condition on an evaluation label', () => {
      expectValid(
        validFields({
          evaluations: [{ label: 'doubled', expression: 'count * 2' }],
          alertConditions: [{ metric: 'doubled', comparator: Comparator.GT, threshold: [1] }],
        })
      );
    });

    it('accepts an evaluation building on an earlier evaluation', () => {
      expectValid(
        validFields({
          evaluations: [
            { label: 'doubled', expression: 'count * 2' },
            { label: 'quadrupled', expression: 'doubled * 2' },
          ],
        })
      );
    });

    it('rejects an evaluation referencing a later evaluation', () => {
      expect(
        issuePaths(
          validFields({
            evaluations: [
              { label: 'early', expression: 'late + 1' },
              { label: 'late', expression: 'count * 2' },
            ],
          })
        )
      ).toContain('evaluations.0.expression');
    });

    it('does not mistake a substring for a label reference', () => {
      expectValid(
        validFields({
          stats: [
            { label: 'count', aggregation: Aggregation.COUNT },
            { label: 'count_total', aggregation: Aggregation.SUM, field: 'bytes' },
          ],
          evaluations: [{ label: 'ratio', expression: 'count / count_total' }],
        })
      );
    });
  });
});
