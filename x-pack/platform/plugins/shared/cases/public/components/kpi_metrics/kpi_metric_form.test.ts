/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KpiMetricRequest } from '../../../common/types/api';
import type { KpiMetricThresholdUnit } from '../../../common/types/domain';
import {
  isDurationMetric,
  toKpiMetricFormState,
  toKpiMetricRequest,
  validateKpiMetricForm,
} from './kpi_metric_form';

const closedDateMetric: Extract<KpiMetricRequest, { kind: 'custom' }> = {
  id: 'metric-1',
  kind: 'custom',
  label: 'Median time to resolve',
  index: 'cases',
  dateField: 'closed_at',
  query: '',
  aggregation: { type: 'median', field: 'case.time_to_resolve' },
  display: 'value',
};

describe('kpi metric form', () => {
  describe('date field', () => {
    it('keeps the closed date through a read and a save', () => {
      const state = toKpiMetricFormState(closedDateMetric);

      expect(state.dateField).toBe('closed_at');
      expect(toKpiMetricRequest(state, closedDateMetric)).toEqual(closedDateMetric);
    });

    it('reads the created date when the metric has no date field', () => {
      expect(toKpiMetricFormState({ ...closedDateMetric, dateField: undefined }).dateField).toBe(
        'created_at'
      );
      expect(toKpiMetricFormState().dateField).toBe('created_at');
    });

    it('removes the date field when the index changes to activity', () => {
      const state = {
        ...toKpiMetricFormState(closedDateMetric),
        index: 'activity' as const,
        aggregationType: 'count' as const,
        field: '',
      };

      expect(toKpiMetricRequest(state, closedDateMetric)).not.toHaveProperty('dateField');
    });

    it('writes no date field for the created date', () => {
      const state = {
        ...toKpiMetricFormState(closedDateMetric),
        dateField: 'created_at' as const,
      };

      expect(toKpiMetricRequest(state, closedDateMetric)).not.toHaveProperty('dateField');
      expect(
        toKpiMetricRequest({ ...toKpiMetricFormState(), label: 'Closed cases' })
      ).not.toHaveProperty('dateField');
    });
  });

  describe('threshold unit', () => {
    const countMetric: KpiMetricRequest = {
      kind: 'custom',
      label: 'Critical cases',
      index: 'cases',
      query: 'case.severity: critical',
      display: 'value',
      threshold: { comparator: 'above', value: 2 },
    };

    const saveDurationThreshold = (thresholdValue: string, thresholdUnit: KpiMetricThresholdUnit) =>
      toKpiMetricRequest(
        {
          ...toKpiMetricFormState(closedDateMetric),
          thresholdComparator: 'above',
          thresholdValue,
          thresholdUnit,
        },
        closedDateMetric
      ).threshold;

    it('selects hours for a new metric', () => {
      expect(toKpiMetricFormState().thresholdUnit).toBe('h');
    });

    it('saves 2 hours as 7200 seconds with the unit', () => {
      expect(saveDurationThreshold('2', 'h')).toEqual({
        comparator: 'above',
        value: 7200,
        unit: 'h',
      });
    });

    it('saves 1.5 hours as 5400 seconds', () => {
      expect(saveDurationThreshold('1.5', 'h')?.value).toBe(5400);
    });

    it('saves 90 minutes as 5400 seconds and shows 90 minutes on edit', () => {
      const threshold = saveDurationThreshold('90', 'm');

      expect(threshold).toEqual({ comparator: 'above', value: 5400, unit: 'm' });

      const state = toKpiMetricFormState({ ...closedDateMetric, threshold });

      expect(state.thresholdValue).toBe('90');
      expect(state.thresholdUnit).toBe('m');
    });

    it('shows a saved value with no unit in the largest whole unit', () => {
      const state = toKpiMetricFormState({
        ...closedDateMetric,
        threshold: { comparator: 'above', value: 172800 },
      });

      expect(state.thresholdValue).toBe('2');
      expect(state.thresholdUnit).toBe('d');
    });

    it('shows a saved value with no whole unit in minutes', () => {
      const state = toKpiMetricFormState({
        ...closedDateMetric,
        threshold: { comparator: 'above', value: 3 },
      });

      expect(state.thresholdValue).toBe('0.05');
      expect(state.thresholdUnit).toBe('m');
    });

    it('saves no unit for a count metric and keeps its value', () => {
      const state = toKpiMetricFormState(countMetric);

      expect(state.thresholdValue).toBe('2');
      expect(toKpiMetricRequest(state, countMetric).threshold).toStrictEqual({
        comparator: 'above',
        value: 2,
      });
    });

    it('treats the predefined average time to close as a duration metric', () => {
      const predefinedState = (predefinedId: string) =>
        toKpiMetricFormState({ kind: 'predefined', predefinedId, display: 'value' });

      expect(isDurationMetric(predefinedState('average_time_to_close'))).toBe(true);
      expect(isDurationMetric(predefinedState('open_cases'))).toBe(false);
    });

    it('rejects a negative duration but not a negative count threshold', () => {
      expect(
        validateKpiMetricForm({
          ...toKpiMetricFormState(closedDateMetric),
          thresholdComparator: 'above',
          thresholdValue: '-1',
        }).thresholdValue
      ).toBe('Enter a value of 0 or more.');
      expect(
        validateKpiMetricForm({ ...toKpiMetricFormState(countMetric), thresholdValue: '-1' })
          .thresholdValue
      ).toBeUndefined();
    });
  });
});
