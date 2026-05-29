/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LENS_DATASOURCE_ID,
  LENS_HEATMAP_CHART_SHAPES,
  LENS_METRIC_ID,
  PARTITION_CHART_TYPES,
  SeriesTypes,
  type FormBasedPersistedState,
  type FormBasedPrivateState,
  type FormBasedLayer,
  type GenericIndexPatternColumn,
  type LensDocument,
} from '@kbn/lens-common';

const BUCKET_OPERATIONS_WITH_EMPTY_ROWS: ReadonlySet<string> = new Set<string>([
  'date_histogram',
  'range',
]);

/** Default `buildColumn` applies when `includeEmptyRows` is omitted. */
const DEFAULT_INCLUDE_EMPTY_ROWS = true;

function normalizeIncludeEmptyRows(value: boolean | undefined): boolean {
  return value ?? DEFAULT_INCLUDE_EMPTY_ROWS;
}

function getIncludeEmptyRows(column: GenericIndexPatternColumn): boolean | undefined {
  return (column as { params?: { includeEmptyRows?: boolean } }).params?.includeEmptyRows;
}

/**
 * Visualization type ids (per `Visualization#getVisualizationTypeId`) that
 * default `includeEmptyRows` to `false` for new bucket columns.
 */
const VIS_TYPES_WITH_EMPTY_ROWS_OFF_BY_DEFAULT: ReadonlySet<string> = new Set<string>([
  // XY bar collapses every orientation and stacking mode to this subtype id.
  SeriesTypes.BAR,
  LENS_HEATMAP_CHART_SHAPES.HEATMAP,
  PARTITION_CHART_TYPES.PIE,
  PARTITION_CHART_TYPES.TREEMAP,
  PARTITION_CHART_TYPES.MOSAIC,
  PARTITION_CHART_TYPES.WAFFLE,
  LENS_METRIC_ID,
  'lnsTagcloud', // Mirrors `getTagcloudVisualization().id`.
]);

/**
 * Default `includeEmptyRows` for a new bucket column, given the active
 * visualization type id. Falls back to the historical `true` when the id is
 * unknown (e.g. a column created outside the Lens editor).
 */
export function getDefaultIncludeEmptyRows(visualizationTypeId?: string): boolean {
  if (!visualizationTypeId) {
    return true;
  }
  return !VIS_TYPES_WITH_EMPTY_ROWS_OFF_BY_DEFAULT.has(visualizationTypeId);
}

/**
 * Per-visualization `buildColumn` param overrides for a new column, or
 * `undefined` when the operation owns no opinionated default.
 */
export function getColumnParamsForNewBucket(
  operationType: string,
  activeVisualizationTypeId?: string
): Record<string, unknown> | undefined {
  if (operationType !== 'date_histogram' && operationType !== 'range') {
    return undefined;
  }
  return { includeEmptyRows: getDefaultIncludeEmptyRows(activeVisualizationTypeId) };
}

function withIncludeEmptyRows(
  column: GenericIndexPatternColumn,
  value: boolean
): GenericIndexPatternColumn {
  const columnParams = (column as { params?: Record<string, unknown> }).params;
  return {
    ...column,
    params: { ...(columnParams ?? {}), includeEmptyRows: value },
  } as unknown as GenericIndexPatternColumn;
}

/**
 * Rewrites bucket columns via a per-column decision callback, returning the
 * same state reference when nothing changed.
 */
function mapBucketColumns(
  state: FormBasedPrivateState,
  decide: (
    layerId: string,
    columnId: string,
    column: GenericIndexPatternColumn
  ) => boolean | undefined
): FormBasedPrivateState {
  if (!state?.layers) {
    return state;
  }

  let changed = false;
  const nextLayers: Record<string, FormBasedLayer> = {};

  for (const layerId of Object.keys(state.layers)) {
    const layer = state.layers[layerId];
    let layerChanged = false;
    const nextColumns: Record<string, GenericIndexPatternColumn> = {};

    for (const columnId of Object.keys(layer.columns)) {
      const column = layer.columns[columnId];
      const nextValue = BUCKET_OPERATIONS_WITH_EMPTY_ROWS.has(column.operationType)
        ? decide(layerId, columnId, column)
        : undefined;
      if (nextValue !== undefined && nextValue !== getIncludeEmptyRows(column)) {
        nextColumns[columnId] = withIncludeEmptyRows(column, nextValue);
        layerChanged = true;
      } else {
        nextColumns[columnId] = column;
      }
    }

    if (layerChanged) {
      nextLayers[layerId] = { ...layer, columns: nextColumns };
      changed = true;
    } else {
      nextLayers[layerId] = layer;
    }
  }

  return changed ? { ...state, layers: nextLayers } : state;
}

/**
 * Applies the target visualization's `includeEmptyRows` default to columns that
 * are new in the suggestion (their id is absent from the previous state),
 * leaving already-configured columns untouched.
 *
 * Returns the suggestion state unchanged when nothing needs to be rewritten.
 */
export function applyEmptyRowsDefaultsToSuggestionState(
  suggestionState: FormBasedPrivateState,
  previousState: FormBasedPrivateState | undefined,
  targetVisualizationTypeId: string | undefined
): FormBasedPrivateState {
  if (getDefaultIncludeEmptyRows(targetVisualizationTypeId)) {
    return suggestionState;
  }

  return mapBucketColumns(suggestionState, (layerId, columnId) => {
    const isNew = !previousState?.layers?.[layerId]?.columns?.[columnId];
    return isNew ? false : undefined;
  });
}

/** Form-based layers from the saved object, or `undefined` when never saved. */
function getPersistedFormBasedLayers(
  persistedDoc: LensDocument | undefined
): FormBasedPersistedState['layers'] | undefined {
  const formBased = persistedDoc?.state?.datasourceStates?.[LENS_DATASOURCE_ID.FORM_BASED] as
    | FormBasedPersistedState
    | undefined;
  return formBased?.layers;
}

/**
 * Re-applies the target visualization's opinionated `includeEmptyRows` default
 * when switching chart type (or XY series type) on a saved visualization.
 *
 * The default is only forced onto a column whose live value diverges from the
 * value stored in the saved object — i.e. a value the chart-type switch itself
 * carried over rather than one the user persisted. A column matching its
 * persisted value, or any column without a persisted baseline (a brand-new,
 * never-saved visualization, or a column the user configured this session), is
 * left untouched so a deliberate switch never silently overwrites a user choice.
 *
 * Returns the state reference unchanged when nothing needs to be rewritten.
 */
export function applyEmptyRowsDefaultsOnTypeSwitch(
  suggestionState: FormBasedPrivateState,
  persistedDoc: LensDocument | undefined,
  targetVisualizationTypeId: string | undefined
): FormBasedPrivateState {
  const targetDefault = getDefaultIncludeEmptyRows(targetVisualizationTypeId);
  const persistedLayers = getPersistedFormBasedLayers(persistedDoc);

  return mapBucketColumns(suggestionState, (layerId, columnId, column) => {
    const persistedColumn = persistedLayers?.[layerId]?.columns?.[columnId];
    if (!persistedColumn || !BUCKET_OPERATIONS_WITH_EMPTY_ROWS.has(persistedColumn.operationType)) {
      return undefined;
    }
    const persistedValue = normalizeIncludeEmptyRows(getIncludeEmptyRows(persistedColumn));
    if (persistedValue === normalizeIncludeEmptyRows(getIncludeEmptyRows(column))) {
      return undefined;
    }
    return targetDefault;
  });
}
