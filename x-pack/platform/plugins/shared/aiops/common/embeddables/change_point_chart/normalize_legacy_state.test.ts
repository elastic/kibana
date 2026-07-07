/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeChangePointChartLegacyFields } from './normalize_legacy_state';

describe('normalizeChangePointChartLegacyFields', () => {
  it('maps legacy camelCase fields to the snake_case shape', () => {
    expect(
      normalizeChangePointChartLegacyFields({
        fn: 'sum',
        viewType: 'table',
        dataViewId: 'data-view-id',
        metricField: 'bytes',
        splitField: 'host.name',
        partitions: ['host-a'],
        maxSeriesToPlot: 12,
      })
    ).toEqual({
      aggregation_function: 'sum',
      view_type: 'table',
      data_view_id: 'data-view-id',
      metric_field: 'bytes',
      split_field: 'host.name',
      partitions: ['host-a'],
      max_series_to_plot: 12,
    });
  });

  it('prefers snake_case values over their legacy camelCase counterparts', () => {
    expect(
      normalizeChangePointChartLegacyFields({
        aggregation_function: 'avg',
        fn: 'sum',
        view_type: 'charts',
        viewType: 'table',
        data_view_id: 'new-id',
        dataViewId: 'old-id',
        metric_field: 'bytes',
        metricField: 'legacy-bytes',
        split_field: 'host.name',
        splitField: 'legacy.host',
        max_series_to_plot: 4,
        maxSeriesToPlot: 99,
      })
    ).toEqual({
      aggregation_function: 'avg',
      view_type: 'charts',
      data_view_id: 'new-id',
      metric_field: 'bytes',
      split_field: 'host.name',
      partitions: undefined,
      max_series_to_plot: 4,
    });
  });

  it('falls back to defaults when both forms are missing', () => {
    expect(normalizeChangePointChartLegacyFields({})).toEqual({
      aggregation_function: 'avg',
      view_type: 'charts',
      data_view_id: undefined,
      metric_field: undefined,
      split_field: undefined,
      partitions: undefined,
      max_series_to_plot: 6,
    });
  });
});
