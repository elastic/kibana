/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CHANGE_POINT_CHART_DEFAULT_SERIES,
  CHANGE_POINT_DETECTION_VIEW_TYPE,
} from '@kbn/aiops-change-point-detection/constants';
import type { ChangePointChartEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';

export interface LegacyChangePointChartEmbeddableState {
  fn?: ChangePointChartEmbeddableState['aggregation_function'];
  dataViewId?: string;
  viewType?: ChangePointChartEmbeddableState['view_type'];
  metricField?: string;
  splitField?: string;
  maxSeriesToPlot?: number;
}

export type NormalizedChangePointChartFields = Omit<LegacyChangePointChartEmbeddableState, 'fn'> & {
  aggregationFunction?: ChangePointChartEmbeddableState['aggregation_function'];
  viewType: ChangePointChartEmbeddableState['view_type'];
  maxSeriesToPlot: ChangePointChartEmbeddableState['max_series_to_plot'];
};

export type RequiredNormalizedChangePointChartFields = NormalizedChangePointChartFields &
  Required<Pick<NormalizedChangePointChartFields, 'aggregationFunction' | 'metricField'>>;

export const getNormalizedFields = (
  state: Partial<ChangePointChartEmbeddableState> & LegacyChangePointChartEmbeddableState,
  dataViewId?: string
): NormalizedChangePointChartFields => {
  return {
    dataViewId: dataViewId ?? state.data_view_id ?? state.dataViewId,
    aggregationFunction: state.aggregation_function ?? state.fn,
    viewType: state.view_type ?? state.viewType ?? CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS,
    metricField: state.metric_field ?? state.metricField,
    splitField: state.split_field ?? state.splitField,
    maxSeriesToPlot:
      state.max_series_to_plot ?? state.maxSeriesToPlot ?? CHANGE_POINT_CHART_DEFAULT_SERIES,
  };
};

export function ensureRequiredStateFields(
  fields: NormalizedChangePointChartFields
): asserts fields is RequiredNormalizedChangePointChartFields {
  if (!fields.aggregationFunction) {
    throw new Error('Invalid change point chart embeddable state: missing aggregation_function');
  }

  if (!fields.metricField) {
    throw new Error('Invalid change point chart embeddable state: missing metric_field');
  }
}

export const stripNormalizedFields = <
  State extends Partial<ChangePointChartEmbeddableState> & LegacyChangePointChartEmbeddableState
>(
  state: State
) => {
  const {
    data_view_id: _currentDataViewId,
    dataViewId: _legacyDataViewId,
    aggregation_function: _currentAggregationFunction,
    fn: _legacyAggregationFunction,
    view_type: _currentViewType,
    viewType: _legacyViewType,
    metric_field: _currentMetricField,
    metricField: _legacyMetricField,
    split_field: _currentSplitField,
    splitField: _legacySplitField,
    max_series_to_plot: _currentMaxSeriesToPlot,
    maxSeriesToPlot: _legacyMaxSeriesToPlot,
    ...rest
  } = state;

  return rest;
};
