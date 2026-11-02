/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { thresholdParamsSchema } from './params_schema';

const minimalParams = {
  indexPattern: 'logs-*',
  timeField: '@timestamp',
  stats: [{ label: 'count', aggregation: 'count' }],
  alertConditions: [{ metric: 'count', comparator: '>', threshold: [100] }],
};

describe('thresholdParamsSchema', () => {
  it('fills defaults for omitted optional collections and operators', () => {
    expect(thresholdParamsSchema.parse(minimalParams)).toEqual({
      ...minimalParams,
      evaluations: [],
      conditionOperator: 'AND',
      groupByFields: [],
    });
  });

  it('accepts a full payload with recovery and multi severity', () => {
    const result = thresholdParamsSchema.safeParse({
      ...minimalParams,
      filterQuery: 'service.name == "api"',
      stats: [
        { label: 'errors', aggregation: 'count', filter: 'http.response.status_code >= 500' },
        { label: 'total', aggregation: 'count' },
      ],
      evaluations: [{ label: 'error_rate', expression: 'errors / total * 100' }],
      alertConditions: [{ metric: 'error_rate', comparator: '>', threshold: [5] }],
      groupByFields: ['service.name'],
      recovery: {
        conditions: [{ metric: 'error_rate', comparator: '<=', threshold: [5] }],
      },
      severity: {
        mode: 'multi',
        levels: [
          { severity: 'medium', threshold: 10 },
          { severity: 'critical', threshold: 20 },
        ],
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects unknown keys, including UI ids', () => {
    const result = thresholdParamsSchema.safeParse({
      ...minimalParams,
      stats: [{ id: '_1', label: 'count', aggregation: 'count' }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty stats list and an empty alert condition list', () => {
    expect(thresholdParamsSchema.safeParse({ ...minimalParams, stats: [] }).success).toBe(false);
    expect(thresholdParamsSchema.safeParse({ ...minimalParams, alertConditions: [] }).success).toBe(
      false
    );
  });

  it('rejects unknown aggregations and comparators', () => {
    expect(
      thresholdParamsSchema.safeParse({
        ...minimalParams,
        stats: [{ label: 'x', aggregation: 'median', field: 'cpu' }],
      }).success
    ).toBe(false);
    expect(
      thresholdParamsSchema.safeParse({
        ...minimalParams,
        alertConditions: [{ metric: 'count', comparator: '==', threshold: [1] }],
      }).success
    ).toBe(false);
  });

  it('rejects more than two thresholds per condition', () => {
    const result = thresholdParamsSchema.safeParse({
      ...minimalParams,
      alertConditions: [{ metric: 'count', comparator: 'between', threshold: [1, 2, 3] }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects an index pattern longer than the bound', () => {
    const result = thresholdParamsSchema.safeParse({
      ...minimalParams,
      indexPattern: 'a'.repeat(1025),
    });

    expect(result.success).toBe(false);
  });
});
