/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import type {
  DataType,
  OperationMetadata,
  ValueFormatConfig,
  IndexPatternRef,
  TextBasedPrivateState,
  TextBasedLayerColumn,
  TextBasedLayer,
} from '@kbn/lens-common';

export const MAX_NUM_OF_COLUMNS = 10;

export async function loadIndexPatternRefs(
  indexPatternsService: DataViewsPublicPluginStart
): Promise<IndexPatternRef[]> {
  const indexPatterns = await indexPatternsService.getIdsWithTitle();

  const timefields = await Promise.all(
    indexPatterns.map((p) => indexPatternsService.get(p.id).then((pat) => pat.timeFieldName))
  );

  return indexPatterns
    .map((p, i) => ({ ...p, timeField: timefields[i] }))
    .sort((a, b) => {
      return a.title.localeCompare(b.title);
    });
}

export const getAllColumns = (
  existingColumns: TextBasedLayerColumn[],
  columnsFromQuery: DatatableColumn[]
) => {
  // filter out columns that do not exist on the query
  const columns = existingColumns.filter((c) => {
    const columnExists = columnsFromQuery?.some((f) => f.name === c?.fieldName);
    if (columnExists) return c;
  });
  const allCols = [
    ...columns,
    ...columnsFromQuery.map((c) => ({
      columnId: c.id,
      fieldName: c.id,
      label: c.name,
      meta: c.meta,
      ...(c.variable ? { variable: c.variable } : {}),
    })),
  ];
  const uniqueIds: string[] = [];

  return allCols.filter((col) => {
    const isDuplicate = uniqueIds.includes(col.columnId);

    if (!isDuplicate) {
      uniqueIds.push(col.columnId);

      return true;
    }

    return false;
  });
};

/**
 * Rebinds existing layer columns (and their dimension mappings) to the columns
 * returned by a changed layer query, so configured dimensions survive query edits.
 *
 * Tie-breaking order per query column, each existing column used at most once:
 * 1. exact match — same `fieldName` as the query column id/name
 * 2. positional match — existing column at the same index, if the meta type matches
 * 3. first unused existing column with the same meta type (best-effort: with
 *    multiple same-type dimensions this can rebind a semantically unrelated
 *    field; preserving the dimension is preferred over dropping it)
 *
 * Query columns with no match produce fresh columns keyed by the query column id.
 *
 * `preferredColumnIds` (typically the columns bound to configured dimensions)
 * win ties within the exact-match and type-match tiers, so orphan duplicates
 * with the same fieldName cannot shadow a dimension-bound column.
 */
export const reconcileQueryColumns = (
  existingColumns: TextBasedLayerColumn[],
  columnsFromQuery: DatatableColumn[],
  preferredColumnIds: Set<string> = new Set()
): TextBasedLayerColumn[] => {
  const usedColumnIds = new Set<string>();
  const findPreferredFirst = (
    predicate: (column: TextBasedLayerColumn) => boolean
  ): TextBasedLayerColumn | undefined =>
    existingColumns.find(
      (column) => preferredColumnIds.has(column.columnId) && predicate(column)
    ) ?? existingColumns.find(predicate);

  return columnsFromQuery.map((queryColumn, index) => {
    const queryFieldName = queryColumn.variable ? `??${queryColumn.variable}` : queryColumn.id;
    const exactMatch = findPreferredFirst(
      (column) =>
        !usedColumnIds.has(column.columnId) &&
        (column.fieldName === queryFieldName ||
          column.fieldName === queryColumn.id ||
          column.fieldName === queryColumn.name)
    );
    const positionalMatch = existingColumns[index];
    // A positional match must not shadow an unused dimension-bound column of the
    // same type (e.g. on a duplicated layer, an orphan duplicate at the query
    // column's index would otherwise win over the bound column and the bound
    // dimension would be reported as missing).
    const unusedPreferredTypeMatchExists = existingColumns.some(
      (column) =>
        preferredColumnIds.has(column.columnId) &&
        !usedColumnIds.has(column.columnId) &&
        column.meta?.type === queryColumn.meta?.type
    );
    const compatiblePositionalMatch =
      positionalMatch &&
      !usedColumnIds.has(positionalMatch.columnId) &&
      positionalMatch.meta?.type === queryColumn.meta?.type &&
      (preferredColumnIds.has(positionalMatch.columnId) || !unusedPreferredTypeMatchExists)
        ? positionalMatch
        : undefined;
    const compatibleMatch = findPreferredFirst(
      (column) =>
        !usedColumnIds.has(column.columnId) && column.meta?.type === queryColumn.meta?.type
    );
    const existingColumn = exactMatch ?? compatiblePositionalMatch ?? compatibleMatch;

    if (!existingColumn) {
      return {
        columnId: queryColumn.id,
        fieldName: queryFieldName,
        label: queryColumn.name,
        meta: queryColumn.meta,
        ...(queryColumn.variable ? { variable: queryColumn.variable } : {}),
      };
    }

    usedColumnIds.add(existingColumn.columnId);
    const { variable, ...restOfExistingColumn } = existingColumn;
    return {
      ...restOfExistingColumn,
      fieldName: queryFieldName,
      label: existingColumn.customLabel ? existingColumn.label : queryColumn.name,
      meta: queryColumn.meta,
      ...(queryColumn.variable ? { variable: queryColumn.variable } : {}),
    };
  });
};

export const isNumeric = (column: TextBasedLayerColumn | DatatableColumn) =>
  column?.meta?.type === 'number';

export const isNotNumeric = (column: TextBasedLayerColumn | DatatableColumn) => !isNumeric(column);

export function resolveTextBasedColumnType(
  column: TextBasedLayerColumn,
  activeColumn?: DatatableColumn
): DataType {
  return (activeColumn?.meta?.type ?? column.meta?.type) as DataType;
}

/**
 * Whether the layer has at least one numeric column, resolved against the Query Result Type
 * overlay when `activeColumns` is available, and falling back to the persisted column type otherwise.
 */
export function hasNumericColumn(
  columns: TextBasedLayerColumn[],
  activeColumns?: DatatableColumn[]
): boolean {
  const activeColumnById = activeColumns
    ? new Map(activeColumns.map((activeColumn) => [activeColumn.id, activeColumn]))
    : undefined;

  return columns.some(
    (column) =>
      resolveTextBasedColumnType(column, activeColumnById?.get(column.columnId)) === 'number'
  );
}

/**
 * Derives the type-shaped operation metadata (dataType, isBucketed, scale) from a single
 * resolved Query Result Type from activeData, so these fields never disagree with each other.
 */
export function operationFromDataType(
  dataType: DataType
): Pick<OperationMetadata, 'dataType' | 'isBucketed' | 'scale'> {
  switch (dataType) {
    case 'date':
      return { dataType, isBucketed: true, scale: 'interval' };
    case 'number':
      return { dataType, isBucketed: false, scale: 'ratio' };
    default:
      return { dataType, isBucketed: true, scale: 'ordinal' };
  }
}

// A column can be dropped/used in a metric dimension when the layer has no numeric column
// (so non-numeric fields have to act as metrics) or when the column itself is numeric.
// `hasNumberColumn` must be derived from the same type source as `selectedColumnType`
// (the Query Result Type overlay when available), otherwise the two can disagree.
export function canColumnBeDroppedInMetricDimension(
  hasNumberColumn: boolean,
  selectedColumnType?: string
): boolean {
  return !hasNumberColumn || selectedColumnType === 'number';
}

export function canColumnBeUsedBeInMetricDimension(
  hasNumberColumn: boolean,
  columnCount: number,
  selectedColumnType?: string
): boolean {
  return !hasNumberColumn || columnCount >= MAX_NUM_OF_COLUMNS || selectedColumnType === 'number';
}

export function mergeLayer({
  state,
  layerId,
  newLayer,
}: {
  state: TextBasedPrivateState;
  layerId: string;
  newLayer: Partial<TextBasedLayer>;
}) {
  return {
    ...state,
    layers: {
      ...state.layers,
      [layerId]: { ...state.layers[layerId], ...newLayer },
    },
  };
}

export function updateColumnLabel({
  layer,
  columnId,
  value,
}: {
  layer: TextBasedLayer;
  columnId: string;
  value: string;
}): TextBasedLayer {
  const currentColumnIndex = layer.columns.findIndex((c) => c.columnId === columnId);
  const currentColumn = layer.columns[currentColumnIndex];
  return {
    ...layer,
    columns: [
      ...layer.columns.slice(0, currentColumnIndex),
      {
        ...currentColumn,
        label: value,
        customLabel: Boolean(value) && value !== currentColumn.fieldName,
      },
      ...layer.columns.slice(currentColumnIndex + 1),
    ],
  };
}

export function updateColumnFormat({
  layer,
  columnId,
  value,
}: {
  layer: TextBasedLayer;
  columnId: string;
  value: ValueFormatConfig | undefined;
}): TextBasedLayer {
  const currentColumnIndex = layer.columns.findIndex((c) => c.columnId === columnId);
  const currentColumn = layer.columns[currentColumnIndex];
  return {
    ...layer,
    columns: [
      ...layer.columns.slice(0, currentColumnIndex),
      {
        ...currentColumn,
        params: { ...currentColumn.params, format: value },
      },
      ...layer.columns.slice(currentColumnIndex + 1),
    ],
  };
}

export function updateColumnDropPartials({
  layer,
  columnId,
  value,
}: {
  layer: TextBasedLayer;
  columnId: string;
  value: boolean;
}): TextBasedLayer {
  const currentColumnIndex = layer.columns.findIndex((c) => c.columnId === columnId);
  const currentColumn = layer.columns[currentColumnIndex];
  return {
    ...layer,
    columns: [
      ...layer.columns.slice(0, currentColumnIndex),
      {
        ...currentColumn,
        params: { ...currentColumn.params, dropPartials: value },
      },
      ...layer.columns.slice(currentColumnIndex + 1),
    ],
  };
}
