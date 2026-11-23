/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CHANGE_POINT_DETECTION_VIEW_TYPE,
  type ChangePointDetectionViewType,
} from '@kbn/aiops-change-point-detection/constants';
import type { ChangePointAggregationFunction } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
import type { DiscoverSessionApiEmbeddableByValueConfig } from '@kbn/as-code-discover-schema';
import {
  CHANGE_POINT_GRID_EMBEDDABLE_TYPE,
  SEARCH_EMBEDDABLE_TYPE,
  type ChangePointGridConfiguration,
} from '@kbn/discover-utils';
import type { TimeRange } from '@kbn/es-query';
import { getChangePointOutputColumnNames } from '@kbn/esql-utils';
import type {
  PanelPackage,
  SerializedTimeRange,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import { SOURCE_COLUMN } from '@kbn/unified-data-table';
import { getChangePointFormTitle } from './change_point_chart_initializer';

const CHANGE_POINT_TABLE_ROW_HEIGHT = 3;

export type ChangePointEsqlFormSubmission =
  | {
      readonly mode: 'form';
      readonly viewType: ChangePointDetectionViewType;
      readonly esql: string;
      readonly dataViewId: string;
      readonly aggregationFunction: ChangePointAggregationFunction;
      readonly metricField: string;
      readonly splitField?: string;
      readonly partitions?: readonly string[];
    }
  | {
      readonly mode: 'esql';
      readonly viewType: ChangePointDetectionViewType;
      readonly esql: string;
    };

export interface ChangePointGridPanelSerializedState extends SerializedTitles, SerializedTimeRange {
  esql: string;
  apply_dashboard_context: true;
  configuration: ChangePointGridConfiguration;
}

export type ChangePointTablePanelSerializedState = DiscoverSessionApiEmbeddableByValueConfig &
  SerializedTitles &
  SerializedTimeRange;

/** Converts a form submission into the persisted configuration stored on change_point_grid. */
export const toChangePointGridConfiguration = (
  submission: ChangePointEsqlFormSubmission
): ChangePointGridConfiguration => {
  if (submission.mode === 'esql') {
    return { mode: 'esql' };
  }

  return {
    mode: 'form',
    data_view_id: submission.dataViewId,
    aggregation_function: submission.aggregationFunction,
    metric_field: submission.metricField,
    ...(submission.splitField ? { split_field: submission.splitField } : {}),
    ...(submission.splitField && submission.partitions?.length
      ? { partitions: [...submission.partitions] }
      : {}),
  };
};

/** Returns the generated title for form mode, or undefined in direct-edit mode. */
export const getChangePointSubmissionTitle = (
  submission: ChangePointEsqlFormSubmission
): string | undefined => {
  if (submission.mode === 'esql') {
    return undefined;
  }

  const title = getChangePointFormTitle({
    fn: submission.aggregationFunction,
    metricField: submission.metricField,
    splitField: submission.splitField,
  });
  return title || undefined;
};

/** Returns the generated title for a persisted form configuration, or undefined for ES|QL mode. */
export const getChangePointConfigurationTitle = (
  configuration: ChangePointGridConfiguration
): string | undefined => {
  if (configuration.mode !== 'form') {
    return undefined;
  }

  const title = getChangePointFormTitle({
    fn: configuration.aggregation_function,
    metricField: configuration.metric_field,
    splitField: configuration.split_field,
  });
  return title || undefined;
};

/** Builds the Dashboard PanelPackage for either the Charts grid or Discover ES|QL table. */
export const buildChangePointPanelPackage = (
  submission: ChangePointEsqlFormSubmission,
  options?: { readonly previewTimeRange?: TimeRange }
): PanelPackage<ChangePointGridPanelSerializedState | ChangePointTablePanelSerializedState> => {
  const title = getChangePointSubmissionTitle(submission);
  const previewTimeRange = options?.previewTimeRange;

  if (submission.viewType === CHANGE_POINT_DETECTION_VIEW_TYPE.TABLE) {
    const { typeColumn, pvalueColumn } = getChangePointOutputColumnNames(submission.esql) ?? {
      typeColumn: 'type',
      pvalueColumn: 'pvalue',
    };
    const serializedState: ChangePointTablePanelSerializedState = {
      ...(title ? { title } : {}),
      ...(previewTimeRange ? { time_range: previewTimeRange } : {}),
      tabs: [
        {
          type: 'default',
          data_source: {
            type: 'esql',
            query: submission.esql,
          },
          sort: [],
          column_order: [typeColumn, SOURCE_COLUMN, pvalueColumn],
          row_height: CHANGE_POINT_TABLE_ROW_HEIGHT,
        },
      ],
    };

    return {
      panelType: SEARCH_EMBEDDABLE_TYPE,
      serializedState,
    };
  }

  const serializedState: ChangePointGridPanelSerializedState = {
    esql: submission.esql,
    apply_dashboard_context: true,
    configuration: toChangePointGridConfiguration(submission),
    ...(title ? { title } : {}),
    ...(previewTimeRange ? { time_range: previewTimeRange } : {}),
  };

  return {
    panelType: CHANGE_POINT_GRID_EMBEDDABLE_TYPE,
    serializedState,
  };
};
