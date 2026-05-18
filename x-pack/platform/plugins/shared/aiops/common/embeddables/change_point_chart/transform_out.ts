/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import { transformTimeRangeOut, transformTitlesOut } from '@kbn/presentation-publishing';
import {
  CHANGE_POINT_CHART_DATA_VIEW_REF_NAME,
  CHANGE_POINT_CHART_DEFAULT_SERIES,
  CHANGE_POINT_DETECTION_VIEW_TYPE,
} from '@kbn/aiops-change-point-detection/constants';
import type { ChangePointChartEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
import { flow } from 'lodash';
import type { StoredChangePointChartEmbeddableState } from './types';

// Pre-9.5 stored state used camelCase for these fields.
interface LegacyChangePointChartFields {
  fn?: ChangePointChartEmbeddableState['aggregation_function'];
  viewType?: ChangePointChartEmbeddableState['view_type'];
  dataViewId?: string;
  metricField?: string;
  splitField?: string;
  maxSeriesToPlot?: number;
}

export function transformOut(
  storedState: StoredChangePointChartEmbeddableState,
  references?: Reference[]
): ChangePointChartEmbeddableState {
  const transformsFlow = flow(
    transformTitlesOut<StoredChangePointChartEmbeddableState>,
    transformTimeRangeOut<StoredChangePointChartEmbeddableState>
  );
  const state = transformsFlow(storedState) as StoredChangePointChartEmbeddableState &
    LegacyChangePointChartFields;

  const dataViewId = references?.find(
    (ref) => ref.name === CHANGE_POINT_CHART_DATA_VIEW_REF_NAME
  )?.id;
  const aggregationFunction = state.aggregation_function ?? state.fn;
  const metricField = state.metric_field ?? state.metricField;
  const splitField = state.split_field ?? state.splitField;
  const viewType = state.view_type ?? state.viewType ?? CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS;
  const maxSeriesToPlot =
    state.max_series_to_plot ?? state.maxSeriesToPlot ?? CHANGE_POINT_CHART_DEFAULT_SERIES;

  if (!dataViewId) {
    throw new Error('Invalid change point chart embeddable state: missing data_view_id reference');
  }
  if (!aggregationFunction) {
    throw new Error('Invalid change point chart embeddable state: missing aggregation_function');
  }
  if (!metricField) {
    throw new Error('Invalid change point chart embeddable state: missing metric_field');
  }

  const {
    fn: _fn,
    viewType: _viewType,
    dataViewId: _dataViewId,
    metricField: _metricField,
    splitField: _splitField,
    maxSeriesToPlot: _maxSeriesToPlot,
    ...passthrough
  } = state;

  return {
    ...passthrough,
    data_view_id: dataViewId,
    aggregation_function: aggregationFunction,
    view_type: viewType,
    metric_field: metricField,
    ...(splitField ? { split_field: splitField } : {}),
    max_series_to_plot: maxSeriesToPlot,
  };
}
