/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IconChartMetric } from '@kbn/chart-icons';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type { TableSuggestion, Visualization, MetricVisualizationState } from '@kbn/lens-common';
import { metricLabel, supportedDataTypes } from './visualization';

const MAX_BUCKETED_COLUMNS = 1;
const MAX_METRIC_COLUMNS = 2; // primary and secondary metric

const hasLayerMismatch = (keptLayerIds: string[], table: TableSuggestion) =>
  keptLayerIds.length > 1 || (keptLayerIds.length && table.layerId !== keptLayerIds[0]);

export const getSuggestions: Visualization<MetricVisualizationState>['getSuggestions'] = ({
  table,
  state,
  keptLayerIds,
}) => {
  const isActive = Boolean(state);

  const metricColumns = table.columns.filter(
    ({ operation }) => supportedDataTypes.has(operation.dataType) && !operation.isBucketed
  );

  const bucketedColumns = table.columns.filter(({ operation }) => operation.isBucketed);

  const unsupportedColumns = table.columns.filter(
    ({ operation }) => !supportedDataTypes.has(operation.dataType) && !operation.isBucketed
  );

  const couldNeverFit =
    unsupportedColumns.length ||
    bucketedColumns.length > MAX_BUCKETED_COLUMNS ||
    metricColumns.length > MAX_METRIC_COLUMNS;

  if (
    !table.columns.length ||
    hasLayerMismatch(keptLayerIds, table) ||
    couldNeverFit ||
    // dragging the first field
    (isActive &&
      table.changeType === 'initial' &&
      metricColumns.length &&
      bucketedColumns.length) ||
    (isActive && table.changeType === 'unchanged')
  ) {
    return [];
  }

  const baseSuggestion = {
    state: {
      ...state,
      layerId: table.layerId,
      layerType: LayerTypes.DATA,
    },
    title: metricColumns[0]?.operation.label || metricLabel,
    previewIcon: IconChartMetric,
    score: 0.5,
    hide: !!bucketedColumns.length,
  };

  const accessorMappings: Pick<MetricVisualizationState, 'metricAccessor' | 'breakdownByAccessor'> =
    {
      metricAccessor: metricColumns[0]?.columnId,
      breakdownByAccessor: bucketedColumns[0]?.columnId,
    };

  baseSuggestion.score = Number(
    (baseSuggestion.score + 0.01 * Object.values(accessorMappings).filter(Boolean).length).toFixed(
      2
    )
  );

  const suggestion = {
    ...baseSuggestion,
    state: {
      ...baseSuggestion.state,
      ...accessorMappings,
      secondaryMetricAccessor: undefined,
      maxAccessor: undefined,
    },
  };

  return [suggestion];
};
