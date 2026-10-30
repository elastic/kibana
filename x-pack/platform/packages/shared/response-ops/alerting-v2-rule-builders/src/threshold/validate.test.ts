/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThresholdFormValues } from './form_types';
import { Aggregation, Comparator } from './form_types';
import { getThresholdValidationErrors } from './validate';

const validValues: ThresholdFormValues = {
  indexPattern: 'logs-*',
  timeField: '@timestamp',
  stats: [{ id: 's1', label: 'count', aggregation: Aggregation.COUNT }],
  evaluations: [],
  alertConditions: [{ id: 'c1', metric: 'count', comparator: Comparator.GT, threshold: [100] }],
  conditionOperator: 'AND',
  groupByFields: [],
};

describe('getThresholdValidationErrors', () => {
  it('returns no errors for valid values', () => {
    expect(getThresholdValidationErrors(validValues)).toEqual([]);
  });

  it('requires an index pattern', () => {
    expect(getThresholdValidationErrors({ ...validValues, indexPattern: '  ' })).toEqual([
      'An index pattern is required.',
    ]);
  });

  it('requires at least one stat', () => {
    expect(getThresholdValidationErrors({ ...validValues, stats: [] })).toEqual([
      'At least one stat is required. Every stat needs a label, and every aggregation other than count needs a field.',
    ]);
  });

  it('reports evaluations that reference unknown metrics', () => {
    expect(
      getThresholdValidationErrors({
        ...validValues,
        evaluations: [{ id: 'e1', label: 'ratio', expression: 'errors / count' }],
      })
    ).toEqual(['Evaluation "ratio" references unknown metrics: errors.']);
  });

  it('requires a condition with a metric', () => {
    expect(
      getThresholdValidationErrors({
        ...validValues,
        alertConditions: [{ id: 'c1', metric: '', comparator: Comparator.GT, threshold: [1] }],
      })
    ).toEqual(['At least one alert condition needs a metric and a threshold.']);
  });

  it('requires a recovery condition with a metric when recovery is set', () => {
    expect(
      getThresholdValidationErrors({
        ...validValues,
        recovery: {
          conditions: [{ id: 'r1', metric: '', comparator: Comparator.LTE, threshold: [1] }],
          conditionOperator: 'AND',
        },
      })
    ).toEqual(['At least one recovery condition needs a metric and a threshold.']);
  });

  describe('severity', () => {
    it('requires exactly one alert condition', () => {
      expect(
        getThresholdValidationErrors({
          ...validValues,
          alertConditions: [
            ...validValues.alertConditions,
            { id: 'c2', metric: 'count', comparator: Comparator.LT, threshold: [1] },
          ],
          severity: { mode: 'single', singleLevelSeverity: 'high', levels: [] },
        })
      ).toEqual(['Severity requires exactly one alert condition.']);
    });

    it('rejects a reserved severity label', () => {
      expect(
        getThresholdValidationErrors({
          ...validValues,
          groupByFields: ['severity'],
          severity: { mode: 'single', singleLevelSeverity: 'high', levels: [] },
        })
      ).toEqual([
        'Severity is unavailable while a stat, evaluation or group-by field is named "severity".',
      ]);
    });

    it('rejects multi severity with a range comparator', () => {
      expect(
        getThresholdValidationErrors({
          ...validValues,
          alertConditions: [
            { id: 'c1', metric: 'count', comparator: Comparator.BETWEEN, threshold: [1, 2] },
          ],
          severity: { mode: 'multi', singleLevelSeverity: 'info', levels: [] },
        })
      ).toEqual(['Multi severity does not support the between or not_between comparators.']);
    });

    it('reports misordered severity bands', () => {
      expect(
        getThresholdValidationErrors({
          ...validValues,
          severity: {
            mode: 'multi',
            singleLevelSeverity: 'info',
            levels: [
              { id: 'l1', severity: 'low', threshold: 300 },
              { id: 'l2', severity: 'critical', threshold: 200 },
            ],
          },
        })
      ).toEqual(['More severe levels must have more extreme thresholds.']);
    });
  });
});
