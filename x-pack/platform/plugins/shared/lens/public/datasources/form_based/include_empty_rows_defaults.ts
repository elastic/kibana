/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LENS_DATASOURCE_ID,
  LENS_METRIC_ID,
  PARTITION_CHART_TYPES,
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

/**
 * The historical default applied by `buildColumn` when `includeEmptyRows` is
 * omitted, used to normalize stored values for equality comparisons.
 */
const DEFAULT_INCLUDE_EMPTY_ROWS = true;

function normalizeIncludeEmptyRows(value: boolean | undefined): boolean {
  return value ?? DEFAULT_INCLUDE_EMPTY_ROWS;
}

function getIncludeEmptyRows(column: GenericIndexPatternColumn): boolean | undefined {
  return (column as { params?: { includeEmptyRows?: boolean } }).params?.includeEmptyRows;
}

/**
 * Visualization type ids (as returned by `Visualization#getVisualizationTypeId`)
 * for which a newly created `date_histogram` or `range` (histogram) column
 * should default `includeEmptyRows` to `false`.
 *
 * The list mirrors the scope of https://github.com/elastic/kibana/issues/254889.
 * Line and area XY subtypes are intentionally excluded because they are
 * handled by the follow-up https://github.com/elastic/kibana/issues/256104.
 */
const VIS_TYPES_WITH_EMPTY_ROWS_OFF_BY_DEFAULT: ReadonlySet<string> = new Set<string>([
  // XY bar (all bar orientations and stacking modes collapse to 'bar')
  'bar',
  // Heatmap (state.shape === 'heatmap')
  'heatmap',
  // Partition subtypes (state.shape with 'donut' normalized to 'pie')
  PARTITION_CHART_TYPES.PIE,
  PARTITION_CHART_TYPES.TREEMAP,
  PARTITION_CHART_TYPES.MOSAIC,
  PARTITION_CHART_TYPES.WAFFLE,
  // Standalone visualizations whose getVisualizationTypeId returns this.id
  LENS_METRIC_ID,
  // Tagcloud has no exported id constant; the literal must match
  // `getTagcloudVisualization().id` in
  // x-pack/platform/plugins/shared/lens/public/visualizations/tagcloud/tagcloud_visualization.tsx
  'lnsTagcloud',
]);

/**
 * Returns the default value for `params.includeEmptyRows` on a newly created
 * `date_histogram` or `range` (histogram) column, given the active Lens
 * visualization type id.
 *
 * The id is the value returned by `Visualization#getVisualizationTypeId`
 * (visualization subtype where applicable, plain visualization id otherwise).
 * When no id is known (e.g. column created outside the Lens editor), the
 * function preserves the historical default of `true`.
 */
export function getDefaultIncludeEmptyRows(visualizationTypeId?: string): boolean {
  if (!visualizationTypeId) {
    return true;
  }
  return !VIS_TYPES_WITH_EMPTY_ROWS_OFF_BY_DEFAULT.has(visualizationTypeId);
}

/**
 * Returns per-visualization column param overrides for newly created columns,
 * or `undefined` when no override is needed for the given operation. Currently
 * scoped to `date_histogram` and `range` (histogram) buckets, both of which
 * own an `includeEmptyRows` switch.
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
 * Rewrites the `date_histogram` / `range` (histogram) columns of a form-based
 * state according to a per-column decision callback, returning the same state
 * reference when nothing changed.
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
 * Walks the form-based suggestion state and applies `includeEmptyRows: false`
 * to any newly created `date_histogram` or `range` (histogram) columns when
 * the target visualization type defaults that switch to off.
 *
 * "Newly created" means columns whose ids did not exist in the previous
 * datasource state. Columns that the user (or a prior step) already
 * configured are left untouched so chart edits never silently flip a
 * user-set switch.
 *
 * Returns the suggestion state unchanged when no adjustment is needed so the
 * common path stays allocation free.
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

/**
 * Reads the persisted (saved-object) form-based layers from the loaded Lens
 * document, or `undefined` when the document has no form-based datasource
 * state (e.g. a brand new, never-saved visualization).
 */
function getPersistedFormBasedLayers(
  persistedDoc: LensDocument | undefined
): FormBasedPersistedState['layers'] | undefined {
  const formBased = persistedDoc?.state?.datasourceStates?.[LENS_DATASOURCE_ID.FORM_BASED] as
    | FormBasedPersistedState
    | undefined;
  return formBased?.layers;
}

/**
 * Re-applies the opinionated per-visualization `includeEmptyRows` default when
 * the user switches the visualization (chart type, XY series type, or adds a
 * layer through the chart switcher).
 *
 * A column keeps its current value only when that value is the persisted
 * (saved-object) value; every other column — newly created in the session, or
 * one whose live value diverges from what was saved — is set to the target
 * visualization's opinionated default. This lets a deliberate switch adopt the
 * new chart type's default while still honoring values that came straight from
 * a saved object.
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
    if (persistedColumn && BUCKET_OPERATIONS_WITH_EMPTY_ROWS.has(persistedColumn.operationType)) {
      const persistedValue = normalizeIncludeEmptyRows(getIncludeEmptyRows(persistedColumn));
      if (persistedValue === normalizeIncludeEmptyRows(getIncludeEmptyRows(column))) {
        return undefined;
      }
    }
    return targetDefault;
  });
}
