/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Aggregation, Comparator } from '@kbn/alerting-v2-rule-builders';
import { fromBuilderFields, toBuilderSubmission } from './builder_fields';
import type { ThresholdFormValues } from './threshold/form_types';

const thresholdFormValues: ThresholdFormValues = {
  indexPattern: 'logs-*',
  timeField: '@timestamp',
  stats: [{ id: 'stat-1', label: 'count', aggregation: Aggregation.COUNT }],
  evaluations: [{ id: 'eval-1', label: 'eval_a', expression: 'count * 2' }],
  alertConditions: [
    { id: 'condition-1', metric: 'eval_a', comparator: Comparator.GT, threshold: [100] },
  ],
  conditionOperator: 'AND',
  groupByFields: ['service.name'],
  recovery: {
    conditions: [
      { id: 'recovery-1', metric: 'eval_a', comparator: Comparator.LT, threshold: [50] },
    ],
    conditionOperator: 'AND',
  },
};

describe('toBuilderSubmission', () => {
  it('strips the form-only list keys the server schema rejects', () => {
    const submission = toBuilderSubmission('threshold', thresholdFormValues);

    expect(submission).toEqual({
      type: 'threshold',
      fields: {
        indexPattern: 'logs-*',
        timeField: '@timestamp',
        stats: [{ label: 'count', aggregation: Aggregation.COUNT }],
        evaluations: [{ label: 'eval_a', expression: 'count * 2' }],
        alertConditions: [{ metric: 'eval_a', comparator: Comparator.GT, threshold: [100] }],
        conditionOperator: 'AND',
        groupByFields: ['service.name'],
        recovery: {
          conditions: [{ metric: 'eval_a', comparator: Comparator.LT, threshold: [50] }],
          conditionOperator: 'AND',
        },
      },
    });
  });

  it('returns undefined for an unregistered builder type', () => {
    expect(toBuilderSubmission('not_registered', thresholdFormValues)).toBeUndefined();
  });

  it('returns undefined when the builder has no state yet', () => {
    expect(toBuilderSubmission('threshold', undefined)).toBeUndefined();
  });
});

describe('fromBuilderFields', () => {
  it('round-trips form state through the persisted fields', () => {
    const submission = toBuilderSubmission('threshold', thresholdFormValues);
    const recovered = fromBuilderFields('threshold', submission?.fields) as ThresholdFormValues;

    // Keys are regenerated on load, so compare everything but the keys.
    expect(stripIds(recovered)).toEqual(stripIds(thresholdFormValues));
    expect(recovered.stats[0].id).toEqual(expect.any(String));
    expect(recovered.evaluations[0].id).toEqual(expect.any(String));
    expect(recovered.alertConditions[0].id).toEqual(expect.any(String));
    expect(recovered.recovery?.conditions[0].id).toEqual(expect.any(String));
  });

  it('returns undefined for fields the builder cannot represent', () => {
    expect(fromBuilderFields('threshold', { indexPattern: 'logs-*' })).toBeUndefined();
  });

  it('returns undefined for an unregistered builder type', () => {
    expect(fromBuilderFields('not_registered', { indexPattern: 'logs-*' })).toBeUndefined();
  });

  it('returns undefined when the stored fields are not an object', () => {
    expect(fromBuilderFields('threshold', 'logs-*')).toBeUndefined();
  });
});

const stripIds = (values: ThresholdFormValues) => ({
  ...values,
  stats: values.stats.map(({ id, ...stat }) => stat),
  evaluations: values.evaluations.map(({ id, ...evaluation }) => evaluation),
  alertConditions: values.alertConditions.map(({ id, ...condition }) => condition),
  ...(values.recovery
    ? {
        recovery: {
          ...values.recovery,
          conditions: values.recovery.conditions.map(({ id, ...condition }) => condition),
        },
      }
    : {}),
});
