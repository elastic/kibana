/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DatasourceStates,
  MetricVisualizationState,
  TextBasedLayer,
  TextBasedLayerColumn,
  TextBasedPersistedState,
} from '@kbn/lens-common';
import {
  buildTrendlineQueryWithMetricFieldMap,
  LENS_DATASOURCE_ID,
  LENS_METRIC_ID,
} from '@kbn/lens-common';
import { isTextBasedState } from '../../../datasources/text_based/hydrate_time_field';
import { isMetricVisualizationState } from './is_metric_state';

function timeColumnFieldName(
  layer: TextBasedLayer,
  timeAccessor: string | undefined
): string | undefined {
  if (!timeAccessor) {
    return undefined;
  }
  return layer.columns.find((column) => column.columnId === timeAccessor)?.fieldName;
}

/**
 * True when the existing trendline already targets the rebuilt time field, so a
 * custom bucket interval can be kept. Matching index/timeField alone is not
 * enough: generic time-field hydration can backfill both layers from the same
 * DataView while the time column still names a stale field.
 */
function hasMatchingTrendlineTimeColumn(
  existing: TextBasedLayer,
  next: TextBasedLayer,
  timeAccessor: string | undefined
): boolean {
  const existingTimeColumn = timeColumnFieldName(existing, timeAccessor);
  const nextTimeColumn = timeColumnFieldName(next, timeAccessor);
  if (!existingTimeColumn || !nextTimeColumn) {
    return false;
  }
  return existingTimeColumn === nextTimeColumn || existingTimeColumn === next.timeField;
}

function copyTrendlineColumn(
  source: TextBasedLayerColumn,
  columnId: string,
  fieldName: string
): TextBasedLayerColumn {
  return {
    ...source,
    columnId,
    fieldName,
  };
}

/**
 * Drops trendline visualization accessors that have no matching column on the rebuilt layer.
 */
function withHydratedTrendlineAccessors(
  visualization: MetricVisualizationState,
  trendlineLayer: TextBasedLayer
): MetricVisualizationState {
  function hasColumn(columnId: string | undefined): boolean {
    return Boolean(
      columnId && trendlineLayer.columns.some((column) => column.columnId === columnId)
    );
  }

  return {
    ...visualization,
    trendlineSecondaryMetricAccessor: hasColumn(visualization.trendlineSecondaryMetricAccessor)
      ? visualization.trendlineSecondaryMetricAccessor
      : undefined,
    trendlineBreakdownByAccessor: hasColumn(visualization.trendlineBreakdownByAccessor)
      ? visualization.trendlineBreakdownByAccessor
      : undefined,
  };
}

/** Rewrites the main ES|QL query into a time-bucketed trendline query. */
function tryBuildTrendlineQuery(
  esqlQuery: string,
  timeField: string,
  metricColumns: Array<TextBasedLayerColumn | undefined>,
  groupByFields: string[]
) {
  try {
    return buildTrendlineQueryWithMetricFieldMap(
      esqlQuery,
      timeField,
      metricColumns
        .filter((column): column is TextBasedLayerColumn => Boolean(column))
        .map((column) => column.fieldName),
      groupByFields
    );
  } catch {
    return undefined;
  }
}

/**
 * Builds the hidden sparkline datasource layer from the main ES|QL layer and
 * visualization trendline accessors.
 */
function buildTrendlineLayer(
  visualization: MetricVisualizationState,
  mainLayer: TextBasedLayer,
  timeField: string,
  esqlQuery: string
): TextBasedLayer | undefined {
  const {
    metricAccessor,
    secondaryMetricAccessor,
    breakdownByAccessor,
    trendlineTimeAccessor,
    trendlineMetricAccessor,
    trendlineSecondaryMetricAccessor,
    trendlineBreakdownByAccessor,
  } = visualization;

  if (!trendlineTimeAccessor || !trendlineMetricAccessor || !metricAccessor) {
    return undefined;
  }

  const metricColumn = mainLayer.columns.find((column) => column.columnId === metricAccessor);
  if (!metricColumn) {
    return undefined;
  }

  const secondaryColumn = secondaryMetricAccessor
    ? mainLayer.columns.find((column) => column.columnId === secondaryMetricAccessor)
    : undefined;
  const breakdownColumn = breakdownByAccessor
    ? mainLayer.columns.find((column) => column.columnId === breakdownByAccessor)
    : undefined;
  // Grouping the trendline by the same field used for BUCKET would be invalid.
  const trendlineBreakdownColumn =
    breakdownColumn && breakdownColumn.fieldName !== timeField ? breakdownColumn : undefined;

  const trendlineQueryResult = tryBuildTrendlineQuery(
    esqlQuery,
    timeField,
    [metricColumn, secondaryColumn],
    trendlineBreakdownColumn ? [trendlineBreakdownColumn.fieldName] : []
  );
  if (!trendlineQueryResult) {
    return undefined;
  }

  // Primary metric could not be produced in the rewritten query (e.g. a FORK branch).
  if (trendlineQueryResult.unavailableMetricFields.includes(metricColumn.fieldName)) {
    return undefined;
  }

  const columns: TextBasedLayerColumn[] = [
    {
      columnId: trendlineTimeAccessor,
      fieldName: trendlineQueryResult.timeField,
      meta: { type: 'date' },
    },
    copyTrendlineColumn(
      metricColumn,
      trendlineMetricAccessor,
      trendlineQueryResult.metricFieldMap.get(metricColumn.fieldName) ?? metricColumn.fieldName
    ),
  ];

  if (
    secondaryColumn &&
    trendlineSecondaryMetricAccessor &&
    !trendlineQueryResult.unavailableMetricFields.includes(secondaryColumn.fieldName)
  ) {
    columns.push(
      copyTrendlineColumn(
        secondaryColumn,
        trendlineSecondaryMetricAccessor,
        trendlineQueryResult.metricFieldMap.get(secondaryColumn.fieldName) ??
          secondaryColumn.fieldName
      )
    );
  }

  if (trendlineBreakdownColumn && trendlineBreakdownByAccessor) {
    columns.push(
      copyTrendlineColumn(
        trendlineBreakdownColumn,
        trendlineBreakdownByAccessor,
        trendlineBreakdownColumn.fieldName
      )
    );
  }

  return {
    index: mainLayer.index,
    query: { esql: trendlineQueryResult.query },
    timeField,
    columns,
    ignoreGlobalFilters: mainLayer.ignoreGlobalFilters,
  };
}

/** Writes the rebuilt trendline layer into text-based datasource state. */
function rebuildEsqlMetricTrendlineLayer(
  visualization: MetricVisualizationState,
  textBasedState: TextBasedPersistedState,
  esqlQuery: string
):
  | { visualizationState: MetricVisualizationState; textBasedState: TextBasedPersistedState }
  | undefined {
  const { trendlineLayerId, layerId } = visualization;
  if (!trendlineLayerId) {
    return undefined;
  }

  const mainLayer = textBasedState.layers[layerId];
  const timeField = mainLayer?.timeField;
  if (!mainLayer || !timeField) {
    return undefined;
  }

  const trendlineLayer = buildTrendlineLayer(visualization, mainLayer, timeField, esqlQuery);
  if (!trendlineLayer) {
    return undefined;
  }

  return {
    visualizationState: withHydratedTrendlineAccessors(visualization, trendlineLayer),
    textBasedState: {
      ...textBasedState,
      layers: {
        ...textBasedState.layers,
        [trendlineLayerId]: trendlineLayer,
      },
    },
  };
}

/**
 * Rebuilds the hidden ES|QL sparkline layer from the main layer after time-field hydration.
 */
export function hydrateEsqlMetricTrendline(
  visualizationState: MetricVisualizationState,
  datasourceStates: DatasourceStates
): { visualizationState: MetricVisualizationState; datasourceStates: DatasourceStates } {
  const unchanged = { visualizationState, datasourceStates };
  const { trendlineLayerId, layerId } = visualizationState;
  if (!trendlineLayerId) {
    return unchanged;
  }

  const textBasedDatasource = datasourceStates[LENS_DATASOURCE_ID.TEXT_BASED];
  if (!textBasedDatasource || !isTextBasedState(textBasedDatasource.state)) {
    return unchanged;
  }
  const textBasedState = textBasedDatasource.state;
  const existingTrendlineLayer = textBasedState.layers[trendlineLayerId];

  const mainLayer = textBasedState.layers[layerId];
  const esqlQuery = mainLayer?.query?.esql;
  if (!esqlQuery) {
    return unchanged;
  }

  const rebuilt = rebuildEsqlMetricTrendlineLayer(visualizationState, textBasedState, esqlQuery);
  if (!rebuilt) {
    return unchanged;
  }

  const nextTrendlineLayer = rebuilt.textBasedState.layers[trendlineLayerId];
  if (
    existingTrendlineLayer &&
    nextTrendlineLayer &&
    existingTrendlineLayer.timeField === nextTrendlineLayer.timeField &&
    existingTrendlineLayer.index === nextTrendlineLayer.index &&
    hasMatchingTrendlineTimeColumn(
      existingTrendlineLayer,
      nextTrendlineLayer,
      visualizationState.trendlineTimeAccessor
    )
  ) {
    return unchanged;
  }

  return {
    visualizationState: rebuilt.visualizationState,
    datasourceStates: {
      ...datasourceStates,
      [LENS_DATASOURCE_ID.TEXT_BASED]: {
        ...textBasedDatasource,
        state: rebuilt.textBasedState,
      },
    },
  };
}

/**
 * Dashboard inline ES|QL edit: suggestions rebuild only the main layer, so copy
 * trendline accessors from the previous visualization and rebuild the hidden layer.
 */
export function hydrateEsqlMetricTrendlineAfterSuggestion({
  visualizationType,
  visualizationState,
  textBasedState,
  previousVisualizationState,
  previousTextBasedState,
  esqlQuery,
}: {
  visualizationType: string | undefined;
  visualizationState: unknown;
  textBasedState: unknown;
  previousVisualizationState: unknown;
  previousTextBasedState?: unknown;
  esqlQuery: string;
}):
  | { visualizationState: MetricVisualizationState; textBasedState: TextBasedPersistedState }
  | undefined {
  if (
    visualizationType !== LENS_METRIC_ID ||
    !isMetricVisualizationState(visualizationState) ||
    !isMetricVisualizationState(previousVisualizationState) ||
    !isTextBasedState(textBasedState)
  ) {
    return undefined;
  }

  const {
    trendlineLayerId,
    trendlineLayerType,
    trendlineMetricAccessor,
    trendlineTimeAccessor,
    trendlineSecondaryMetricAccessor,
    trendlineBreakdownByAccessor,
  } = previousVisualizationState;
  if (!trendlineLayerId) {
    return undefined;
  }

  const trendlineAccessors = {
    trendlineLayerId,
    trendlineLayerType,
    trendlineMetricAccessor,
    trendlineTimeAccessor,
    trendlineSecondaryMetricAccessor,
    trendlineBreakdownByAccessor,
  };
  const visualizationWithTrendline = {
    ...visualizationState,
    ...trendlineAccessors,
  };

  const previousTrendlineLayer = isTextBasedState(previousTextBasedState)
    ? previousTextBasedState.layers[trendlineLayerId]
    : undefined;
  const mainLayer = textBasedState.layers[visualizationState.layerId];
  const canReusePreviousDataset = Boolean(
    mainLayer?.index &&
      previousTrendlineLayer?.index &&
      mainLayer.index === previousTrendlineLayer.index
  );
  const fallbackTimeField =
    mainLayer?.timeField ??
    (canReusePreviousDataset ? previousTrendlineLayer?.timeField : undefined);
  const textBasedStateWithTimeField =
    mainLayer && fallbackTimeField && !mainLayer.timeField
      ? {
          ...textBasedState,
          layers: {
            ...textBasedState.layers,
            [visualizationState.layerId]: { ...mainLayer, timeField: fallbackTimeField },
          },
        }
      : textBasedState;

  const rebuilt = rebuildEsqlMetricTrendlineLayer(
    visualizationWithTrendline,
    textBasedStateWithTimeField,
    esqlQuery
  );
  if (rebuilt) {
    return rebuilt;
  }

  if (!previousTrendlineLayer || !canReusePreviousDataset) {
    return undefined;
  }

  return {
    visualizationState: visualizationWithTrendline,
    textBasedState: {
      ...textBasedState,
      layers: {
        ...textBasedState.layers,
        [trendlineLayerId]: previousTrendlineLayer,
      },
    },
  };
}
