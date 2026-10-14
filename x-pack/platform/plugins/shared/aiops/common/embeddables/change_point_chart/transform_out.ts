/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import { transformTimeRangeOut, transformTitlesOut } from '@kbn/presentation-publishing';
import { CHANGE_POINT_CHART_DATA_VIEW_REF_NAME } from '@kbn/aiops-change-point-detection/constants';
import type { ChangePointChartEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
import { flow } from 'lodash';
import {
  type LegacyChangePointChartFields,
  normalizeChangePointChartLegacyFields,
} from './normalize_legacy_state';
import type { StoredChangePointChartEmbeddableState } from './types';

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

  const normalized = normalizeChangePointChartLegacyFields(state);
  const dataViewId =
    references?.find((ref) => ref.name === CHANGE_POINT_CHART_DATA_VIEW_REF_NAME)?.id ??
    normalized.data_view_id;

  if (!dataViewId) {
    throw new Error('Invalid change point chart embeddable state: missing data_view_id reference');
  }
  if (!normalized.metric_field) {
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
    aggregation_function: normalized.aggregation_function,
    view_type: normalized.view_type,
    metric_field: normalized.metric_field,
    ...(normalized.split_field ? { split_field: normalized.split_field } : {}),
    max_series_to_plot: normalized.max_series_to_plot,
  };
}
