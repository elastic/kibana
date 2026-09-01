/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateThresholdQuery } from '@kbn/alerting-v2-rule-builders';
import { buildThresholdEsql } from './build_esql';
import { thresholdFormValuesToBuilderFields } from './builder_fields';
import { Aggregation, Comparator, type ThresholdFormValues } from './form_types';

/**
 * The builder step previews the query with `buildThresholdEsql`, which is
 * lenient so it can render while the form is still incomplete, while the stored
 * query comes from `generateThresholdQuery` on the server. For a form the user
 * can actually save, the two must agree — otherwise reopening a saved rule would
 * show a query that differs from the one it runs.
 */
const values = (overrides: Partial<ThresholdFormValues> = {}): ThresholdFormValues => ({
  indexPattern: 'logs-*',
  timeField: '@timestamp',
  stats: [{ id: 's1', label: 'errors', aggregation: Aggregation.COUNT, filter: 'status >= 500' }],
  evaluations: [],
  alertConditions: [{ id: 'c1', metric: 'errors', comparator: Comparator.GT, threshold: [100] }],
  conditionOperator: 'AND',
  groupByFields: [],
  ...overrides,
});

const generated = (formValues: ThresholdFormValues): string => {
  const { query } = generateThresholdQuery(thresholdFormValuesToBuilderFields(formValues));
  if (query.format !== 'composed') {
    throw new Error('threshold builder must generate a composed query');
  }
  return `${query.base}\n  ${query.breach?.segment ?? ''}`.trim();
};

describe('threshold preview and generated query parity', () => {
  it.each<[string, ThresholdFormValues]>([
    ['a count with an inline filter', values()],
    ['a global filter', values({ filterQuery: 'service.name == "api"' })],
    ['group-by fields', values({ groupByFields: ['host.name', 'service.name'] })],
    [
      'an evaluation over two stats',
      values({
        stats: [
          { id: 's1', label: 'errors', aggregation: Aggregation.COUNT, filter: 'status >= 500' },
          { id: 's2', label: 'total', aggregation: Aggregation.COUNT },
        ],
        evaluations: [{ id: 'e1', label: 'error_rate', expression: 'errors / total * 100' }],
        alertConditions: [
          { id: 'c1', metric: 'error_rate', comparator: Comparator.GT, threshold: [5] },
        ],
      }),
    ],
    [
      'a field aggregation',
      values({
        stats: [
          { id: 's1', label: 'avg_latency', aggregation: Aggregation.AVG, field: 'latency_ms' },
        ],
        alertConditions: [
          { id: 'c1', metric: 'avg_latency', comparator: Comparator.GTE, threshold: [500] },
        ],
      }),
    ],
    [
      'a range comparator',
      values({
        alertConditions: [
          { id: 'c1', metric: 'errors', comparator: Comparator.BETWEEN, threshold: [10, 20] },
        ],
      }),
    ],
    [
      'conditions combined with OR',
      values({
        alertConditions: [
          { id: 'c1', metric: 'errors', comparator: Comparator.GT, threshold: [100] },
          { id: 'c2', metric: 'errors', comparator: Comparator.LT, threshold: [1] },
        ],
        conditionOperator: 'OR',
      }),
    ],
  ])('renders the same query for %s', (_name, formValues) => {
    expect(buildThresholdEsql(formValues)).toBe(generated(formValues));
  });
});
