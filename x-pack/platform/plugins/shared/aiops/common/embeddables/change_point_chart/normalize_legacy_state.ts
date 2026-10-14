/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CHANGE_POINT_CHART_DEFAULT_AGG_FUNCTION,
  CHANGE_POINT_CHART_DEFAULT_SERIES,
  CHANGE_POINT_DETECTION_VIEW_TYPE,
} from '@kbn/aiops-change-point-detection/constants';
import type { ChangePointChartEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';

// Pre-9.5 stored state used camelCase for these fields.
export interface LegacyChangePointChartFields {
  fn?: ChangePointChartEmbeddableState['aggregation_function'];
  viewType?: ChangePointChartEmbeddableState['view_type'];
  dataViewId?: string;
  metricField?: string;
  splitField?: string;
  maxSeriesToPlot?: number;
}

export type RawChangePointChartState = Partial<ChangePointChartEmbeddableState> &
  LegacyChangePointChartFields;

interface NormalizedChangePointChartFields {
  aggregation_function: ChangePointChartEmbeddableState['aggregation_function'];
  view_type: ChangePointChartEmbeddableState['view_type'];
  data_view_id: string | undefined;
  metric_field: string | undefined;
  split_field: string | undefined;
  partitions: string[] | undefined;
  max_series_to_plot: number;
}

export const normalizeChangePointChartLegacyFields = (
  state: RawChangePointChartState
): NormalizedChangePointChartFields => ({
  aggregation_function:
    state.aggregation_function ?? state.fn ?? CHANGE_POINT_CHART_DEFAULT_AGG_FUNCTION,
  view_type: state.view_type ?? state.viewType ?? CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS,
  data_view_id: state.data_view_id ?? state.dataViewId,
  metric_field: state.metric_field ?? state.metricField,
  split_field: state.split_field ?? state.splitField,
  partitions: state.partitions,
  max_series_to_plot:
    state.max_series_to_plot ?? state.maxSeriesToPlot ?? CHANGE_POINT_CHART_DEFAULT_SERIES,
});
