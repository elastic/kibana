/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { changePointChartEmbeddableStateSchema } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
import { CHANGE_POINT_CHART_DATA_VIEW_REF_NAME } from '@kbn/aiops-change-point-detection/constants';
import { transformIn } from './transform_in';
import { transformOut } from './transform_out';
import type { StoredChangePointChartEmbeddableState } from './types';

describe('change point chart embeddable transforms', () => {
  it('validates the dashboard-as-code schema and applies defaults', () => {
    const state = changePointChartEmbeddableStateSchema.parse({
      data_view_id: 'data-view-id',
      aggregation_function: 'avg',
      metric_field: 'bytes',
    });

    expect(state).toEqual({
      aggregation_function: 'avg',
      data_view_id: 'data-view-id',
      max_series_to_plot: 6,
      metric_field: 'bytes',
      view_type: 'charts',
    });
  });

  it('defaults aggregation_function to avg when omitted from the schema input', () => {
    const state = changePointChartEmbeddableStateSchema.parse({
      data_view_id: 'data-view-id',
      metric_field: 'bytes',
    });

    expect(state.aggregation_function).toBe('avg');
  });

  it('rejects unsupported aggregation functions', () => {
    expect(() =>
      changePointChartEmbeddableStateSchema.parse({
        data_view_id: 'data-view-id',
        aggregation_function: 'median',
        metric_field: 'bytes',
      })
    ).toThrow();
  });

  it('rejects partitions when split_field is missing', () => {
    expect(() =>
      changePointChartEmbeddableStateSchema.parse({
        data_view_id: 'data-view-id',
        aggregation_function: 'avg',
        metric_field: 'bytes',
        partitions: ['host-a'],
      })
    ).toThrow('`partitions` requires `split_field` to be set');
  });

  it('extracts the data view reference from snake_case state', () => {
    expect(
      transformIn({
        aggregation_function: 'avg',
        data_view_id: 'data-view-id',
        max_series_to_plot: 6,
        metric_field: 'bytes',
        view_type: 'charts',
      })
    ).toEqual({
      state: {
        aggregation_function: 'avg',
        max_series_to_plot: 6,
        metric_field: 'bytes',
        view_type: 'charts',
      },
      references: [
        {
          id: 'data-view-id',
          name: CHANGE_POINT_CHART_DATA_VIEW_REF_NAME,
          type: DATA_VIEW_SAVED_OBJECT_TYPE,
        },
      ],
    });
  });

  it('normalizes legacy camelCase stored state to snake_case API state', () => {
    const legacyStoredState = {
      title: 'Change point',
      timeRange: { from: 'now-7d', to: 'now' },
      hidePanelTitles: true,
      viewType: 'table',
      fn: 'sum',
      metricField: 'bytes',
      splitField: 'host.name',
      partitions: ['host-a'],
      maxSeriesToPlot: 12,
    } as unknown as StoredChangePointChartEmbeddableState;

    expect(
      transformOut(legacyStoredState, [
        {
          id: 'data-view-id',
          name: CHANGE_POINT_CHART_DATA_VIEW_REF_NAME,
          type: DATA_VIEW_SAVED_OBJECT_TYPE,
        },
      ])
    ).toEqual({
      aggregation_function: 'sum',
      data_view_id: 'data-view-id',
      hide_title: true,
      max_series_to_plot: 12,
      metric_field: 'bytes',
      partitions: ['host-a'],
      split_field: 'host.name',
      time_range: { from: 'now-7d', to: 'now' },
      title: 'Change point',
      view_type: 'table',
    });
  });

  it('throws when stored state is missing a required metric field', () => {
    const storedState = {
      aggregation_function: 'sum',
      view_type: 'charts',
      max_series_to_plot: 6,
    } as unknown as StoredChangePointChartEmbeddableState;

    expect(() =>
      transformOut(storedState, [
        {
          id: 'data-view-id',
          name: CHANGE_POINT_CHART_DATA_VIEW_REF_NAME,
          type: DATA_VIEW_SAVED_OBJECT_TYPE,
        },
      ])
    ).toThrow('Invalid change point chart embeddable state: missing metric_field');
  });

  it('defaults aggregation_function to avg when missing from stored state', () => {
    const storedState = {
      view_type: 'charts',
      metric_field: 'bytes',
      max_series_to_plot: 6,
    } as unknown as StoredChangePointChartEmbeddableState;

    const result = transformOut(storedState, [
      {
        id: 'data-view-id',
        name: CHANGE_POINT_CHART_DATA_VIEW_REF_NAME,
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
      },
    ]);

    expect(result.aggregation_function).toBe('avg');
  });

  it('throws when stored state is missing the data view reference', () => {
    const storedState = {
      aggregation_function: 'sum',
      view_type: 'charts',
      metric_field: 'bytes',
      max_series_to_plot: 6,
    } as unknown as StoredChangePointChartEmbeddableState;

    expect(() => transformOut(storedState, [])).toThrow(
      'Invalid change point chart embeddable state: missing data_view_id reference'
    );
  });
});
