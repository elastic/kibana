/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KpiMetricRequest } from '../../../common/types/api';
import { toKpiMetricFormState, toKpiMetricRequest } from './kpi_metric_form';

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
});
