/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KpiMetricRequest } from '../../../common/types/api';
import type { KpiMetricThresholdUnit } from '../../../common/types/domain';
import {
  isAlertMetric,
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

  describe('group by', () => {
    const breakdownMetric: Extract<KpiMetricRequest, { kind: 'custom' }> = {
      id: 'metric-2',
      kind: 'custom',
      label: 'Cases by severity',
      index: 'cases',
      query: '',
      display: 'value',
      groupBy: { field: 'case.severity', size: 3 },
    };
    const newState = toKpiMetricFormState();

    it('reads a saved group-by field and size and saves the same request', () => {
      const state = toKpiMetricFormState(breakdownMetric);

      expect(state.groupByField).toBe('case.severity');
      expect(state.groupBySize).toBe('3');
      expect(toKpiMetricRequest(state, breakdownMetric)).toEqual(breakdownMetric);
    });

    it('saves size 5 for a new field with no typed size', () => {
      const request = toKpiMetricRequest({
        ...newState,
        label: 'Cases by tag',
        groupByField: 'case.tags',
      });

      expect(request).toEqual(
        expect.objectContaining({ groupBy: { field: 'case.tags', size: 5 } })
      );
    });

    it('saves no percent and no threshold for a group-by field', () => {
      const request = toKpiMetricRequest({
        ...newState,
        label: 'Cases by severity',
        groupByField: 'case.severity',
        percent: true,
        thresholdComparator: 'above',
        thresholdValue: '10',
      });

      expect(request).not.toHaveProperty('percent');
      expect(request).not.toHaveProperty('threshold');
      expect(request).toHaveProperty('groupBy', { field: 'case.severity', size: 5 });
    });

    it('saves no group-by field when the calculation is not a count', () => {
      const request = toKpiMetricRequest({
        ...toKpiMetricFormState(breakdownMetric),
        aggregationType: 'avg',
        field: 'case.time_to_resolve',
      });

      expect(request).not.toHaveProperty('groupBy');
    });

    it.each(['0', '11', '2.5'])('rejects the size %s', (groupBySize) => {
      expect(
        validateKpiMetricForm({ ...toKpiMetricFormState(breakdownMetric), groupBySize }).groupBySize
      ).toBe('Enter a whole number from 1 to 10.');
    });

    it('accepts a keyword extended field and rejects another extended field', () => {
      const validate = (groupByField: string) =>
        validateKpiMetricForm({ ...toKpiMetricFormState(breakdownMetric), groupByField })
          .groupByField;

      expect(validate('case.extended_fields.team_as_keyword')).toBeUndefined();
      expect(validate('case.extended_fields.score_as_long')).toBe(
        'Select a field from the list, or enter an extended field that ends in _as_keyword.'
      );
    });

    it('saves a metric with no group-by field with no change', () => {
      expect(toKpiMetricRequest(toKpiMetricFormState(closedDateMetric), closedDateMetric)).toEqual(
        closedDateMetric
      );
    });
  });

  describe('acknowledge trigger', () => {
    const alertMetric: Extract<KpiMetricRequest, { kind: 'predefined' }> = {
      id: 'metric-1',
      kind: 'predefined',
      predefinedId: 'alert_time_to_acknowledge_avg',
      display: 'value',
    };

    it('reads the saved trigger and saves the same request', () => {
      const metric = { ...alertMetric, acknowledgeTrigger: 'assigned' as const };
      const state = toKpiMetricFormState(metric);

      expect(state.acknowledgeTrigger).toBe('assigned');
      expect(toKpiMetricRequest(state, metric)).toEqual(metric);
    });

    it('saves a metric with no trigger again with no field', () => {
      expect(toKpiMetricRequest(toKpiMetricFormState(alertMetric), alertMetric)).toEqual(
        alertMetric
      );
    });

    it('writes the trigger when the admin selects another one', () => {
      const state = {
        ...toKpiMetricFormState(alertMetric),
        acknowledgeTrigger: 'in_progress' as const,
      };

      expect(toKpiMetricRequest(state, alertMetric)).toEqual({
        ...alertMetric,
        acknowledgeTrigger: 'in_progress',
      });
    });

    it('keeps the saved trigger when the admin selects the default again', () => {
      const metric = { ...alertMetric, acknowledgeTrigger: 'assigned' as const };
      const state = {
        ...toKpiMetricFormState(metric),
        acknowledgeTrigger: 'assigned_or_in_progress' as const,
      };

      expect(toKpiMetricRequest(state, metric)).toEqual({
        ...metric,
        acknowledgeTrigger: 'assigned_or_in_progress',
      });
    });

    it('keeps the other saved options of the alert metric', () => {
      const metric = {
        ...alertMetric,
        aggregateBy: 'case' as const,
        dateBasis: 'case_closed_at' as const,
        caseQuery: 'case.category: "IR"',
      };

      expect(toKpiMetricRequest(toKpiMetricFormState(metric), metric)).toEqual(metric);
    });

    it('round trips the case query and writes no case query for an empty field', () => {
      const metric = { ...alertMetric, caseQuery: 'case.category: "IR"' };
      const state = toKpiMetricFormState(metric);

      expect(state.caseQuery).toBe('case.category: "IR"');
      expect(toKpiMetricRequest(state, metric)).toEqual(metric);
      expect(toKpiMetricRequest({ ...state, caseQuery: '  ' }, metric)).toEqual(alertMetric);
      expect(toKpiMetricRequest(toKpiMetricFormState(alertMetric), alertMetric)).toEqual(
        alertMetric
      );
    });

    it('gives an error for a case query that is not valid KQL', () => {
      const state = toKpiMetricFormState(alertMetric);

      expect(validateKpiMetricForm({ ...state, caseQuery: 'case.category: "IR"' })).toEqual({});
      expect(
        validateKpiMetricForm({ ...state, caseQuery: 'case.category: "IR" or (case.status: *' })
          .caseQuery
      ).toBeDefined();
    });

    it('reads the per-case mode and writes it only when it is not the default or was saved', () => {
      const state = toKpiMetricFormState(alertMetric);

      expect(state.aggregateBy).toBe('alert');
      expect(toKpiMetricRequest(state, alertMetric)).toEqual(alertMetric);
      expect(toKpiMetricRequest({ ...state, aggregateBy: 'case' }, alertMetric)).toEqual({
        ...alertMetric,
        aggregateBy: 'case',
      });

      const saved = { ...alertMetric, aggregateBy: 'case' as const };

      expect(toKpiMetricRequest(toKpiMetricFormState(saved), saved)).toEqual(saved);
      expect(
        toKpiMetricRequest({ ...toKpiMetricFormState(saved), aggregateBy: 'alert' }, saved)
      ).toEqual({ ...alertMetric, aggregateBy: 'alert' });
    });

    it('reads the date basis and writes it only when it is not the default or was saved', () => {
      const state = toKpiMetricFormState(alertMetric);

      expect(state.dateBasis).toBe('attached_at');
      expect(toKpiMetricRequest(state, alertMetric)).toEqual(alertMetric);
      expect(toKpiMetricRequest({ ...state, dateBasis: 'case_closed_at' }, alertMetric)).toEqual({
        ...alertMetric,
        dateBasis: 'case_closed_at',
      });

      const saved = { ...alertMetric, dateBasis: 'case_closed_at' as const };

      expect(toKpiMetricRequest(toKpiMetricFormState(saved), saved)).toEqual(saved);
    });

    it('writes no trigger for a metric that is not an alert metric', () => {
      const openCases: KpiMetricRequest = {
        kind: 'predefined',
        predefinedId: 'open_cases',
        display: 'value',
      };
      const state = { ...toKpiMetricFormState(openCases), acknowledgeTrigger: 'assigned' as const };

      expect(isAlertMetric(state)).toBe(false);
      expect(toKpiMetricRequest(state, openCases)).toEqual(openCases);
    });
  });
});
