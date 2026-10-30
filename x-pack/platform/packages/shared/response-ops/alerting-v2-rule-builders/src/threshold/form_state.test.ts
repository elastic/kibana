/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Aggregation, Comparator } from './form_types';
import type { ThresholdParams } from './params_schema';
import { fromThresholdFormState, toThresholdFormState } from './form_state';

const minimalParams: ThresholdParams = {
  indexPattern: 'logs-*',
  timeField: '@timestamp',
  stats: [{ label: 'count', aggregation: Aggregation.COUNT }],
  evaluations: [],
  alertConditions: [{ metric: 'count', comparator: Comparator.GT, threshold: [100] }],
  conditionOperator: 'AND',
  groupByFields: [],
};

const fullParams: ThresholdParams = {
  indexPattern: 'logs-*',
  timeField: 'event.ingested',
  filterQuery: 'service.name == "api"',
  stats: [
    { label: 'errors', aggregation: Aggregation.COUNT, filter: 'status >= 500' },
    { label: 'p95_latency', aggregation: Aggregation.P95, field: 'latency' },
  ],
  evaluations: [{ label: 'error_rate', expression: 'errors / 10' }],
  alertConditions: [{ metric: 'error_rate', comparator: Comparator.GT, threshold: [5] }],
  conditionOperator: 'OR',
  groupByFields: ['service.name', 'host.name'],
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

describe('toThresholdFormState', () => {
  it('assigns unique ids to every list item', () => {
    const formState = toThresholdFormState(fullParams);
    const ids = [
      ...formState.stats.map(({ id }) => id),
      ...formState.evaluations.map(({ id }) => id),
      ...formState.alertConditions.map(({ id }) => id),
      ...(formState.recovery?.conditions.map(({ id }) => id) ?? []),
      ...(formState.severity?.levels.map(({ id }) => id) ?? []),
    ];

    expect(ids).toHaveLength(7);
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('omits optional sections that are absent from the params', () => {
    const formState = toThresholdFormState(minimalParams);

    expect(formState).not.toHaveProperty('filterQuery');
    expect(formState).not.toHaveProperty('recovery');
    expect(formState).not.toHaveProperty('severity');
  });

  it('copies thresholds instead of sharing the params arrays', () => {
    const formState = toThresholdFormState(minimalParams);

    expect(formState.alertConditions[0].threshold).not.toBe(
      minimalParams.alertConditions[0].threshold
    );
  });
});

describe('fromThresholdFormState', () => {
  it('round-trips minimal params', () => {
    expect(fromThresholdFormState(toThresholdFormState(minimalParams))).toEqual(minimalParams);
  });

  it('round-trips params with every optional section set', () => {
    expect(fromThresholdFormState(toThresholdFormState(fullParams))).toEqual(fullParams);
  });

  it('drops the UI ids', () => {
    const params = fromThresholdFormState(toThresholdFormState(fullParams));

    expect(JSON.stringify(params)).not.toContain('"id"');
  });
});
