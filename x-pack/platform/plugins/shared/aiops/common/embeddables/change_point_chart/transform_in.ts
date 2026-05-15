/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import type { Reference } from '@kbn/content-management-utils';
import { CHANGE_POINT_CHART_DATA_VIEW_REF_NAME } from '@kbn/aiops-change-point-detection/constants';
import type { ChangePointChartEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
import type { StoredChangePointChartEmbeddableState } from './types';
import {
  ensureRequiredStateFields,
  getNormalizedFields,
  stripNormalizedFields,
  type LegacyChangePointChartEmbeddableState,
} from './field_names';

export function transformIn(state: ChangePointChartEmbeddableState): {
  state: StoredChangePointChartEmbeddableState;
  references: Reference[];
} {
  const stateWithLegacyFields = state as ChangePointChartEmbeddableState &
    LegacyChangePointChartEmbeddableState;
  const normalizedFields = getNormalizedFields(stateWithLegacyFields);
  ensureRequiredStateFields(normalizedFields);
  const rest = stripNormalizedFields(stateWithLegacyFields);

  return {
    state: {
      ...rest,
      aggregation_function: normalizedFields.aggregationFunction,
      view_type: normalizedFields.viewType,
      metric_field: normalizedFields.metricField,
      ...(normalizedFields.splitField ? { split_field: normalizedFields.splitField } : {}),
      max_series_to_plot: normalizedFields.maxSeriesToPlot,
    },
    references: normalizedFields.dataViewId
      ? [
          {
            type: DATA_VIEW_SAVED_OBJECT_TYPE,
            name: CHANGE_POINT_CHART_DATA_VIEW_REF_NAME,
            id: normalizedFields.dataViewId,
          },
        ]
      : [],
  };
}
