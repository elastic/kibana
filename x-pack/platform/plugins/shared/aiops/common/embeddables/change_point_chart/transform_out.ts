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
import type { StoredChangePointChartEmbeddableState } from './types';
import {
  ensureRequiredStateFields,
  getNormalizedFields,
  stripNormalizedFields,
  type LegacyChangePointChartEmbeddableState,
  type NormalizedChangePointChartFields,
  type RequiredNormalizedChangePointChartFields,
} from './field_names';

type RequiredTransformOutFields = RequiredNormalizedChangePointChartFields &
  Required<Pick<NormalizedChangePointChartFields, 'dataViewId'>>;

function ensureRequiredFields(
  fields: NormalizedChangePointChartFields
): asserts fields is RequiredTransformOutFields {
  if (!fields.dataViewId) {
    throw new Error('Invalid change point chart embeddable state: missing data_view_id reference');
  }

  ensureRequiredStateFields(fields);
}

export function transformOut(
  storedState: StoredChangePointChartEmbeddableState,
  references?: Reference[]
): ChangePointChartEmbeddableState {
  const transformsFlow = flow(
    transformTitlesOut<StoredChangePointChartEmbeddableState>,
    transformTimeRangeOut<StoredChangePointChartEmbeddableState>
  );
  const state = transformsFlow(storedState);
  const dataViewIdRef = references?.find(
    (ref) => ref.name === CHANGE_POINT_CHART_DATA_VIEW_REF_NAME
  );
  const stateWithLegacyFields = state as StoredChangePointChartEmbeddableState &
    LegacyChangePointChartEmbeddableState;
  const normalizedFields = getNormalizedFields(stateWithLegacyFields, dataViewIdRef?.id);
  ensureRequiredFields(normalizedFields);
  const rest = stripNormalizedFields(stateWithLegacyFields);

  return {
    ...rest,
    aggregation_function: normalizedFields.aggregationFunction,
    view_type: normalizedFields.viewType,
    metric_field: normalizedFields.metricField,
    ...(normalizedFields.splitField ? { split_field: normalizedFields.splitField } : {}),
    max_series_to_plot: normalizedFields.maxSeriesToPlot,
    data_view_id: normalizedFields.dataViewId,
  };
}
