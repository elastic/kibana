/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import type {
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
    const exactMatch = findPreferredFirst(
      (column) =>
        !usedColumnIds.has(column.columnId) &&
        (column.fieldName === queryColumn.id || column.fieldName === queryColumn.name)
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
        fieldName: queryColumn.id,
        label: queryColumn.name,
        meta: queryColumn.meta,
        ...(queryColumn.variable ? { variable: queryColumn.variable } : {}),
      };
    }

    usedColumnIds.add(existingColumn.columnId);
    const { variable, ...restOfExistingColumn } = existingColumn;
    return {
      ...restOfExistingColumn,
      fieldName: queryColumn.id,
      label: existingColumn.customLabel ? existingColumn.label : queryColumn.name,
      meta: queryColumn.meta,
      ...(queryColumn.variable ? { variable: queryColumn.variable } : {}),
    };
  });
};

export const isNumeric = (column: TextBasedLayerColumn | DatatableColumn) =>
  column?.meta?.type === 'number';

export const isNotNumeric = (column: TextBasedLayerColumn | DatatableColumn) => !isNumeric(column);

export function canColumnBeDroppedInMetricDimension(
  columns: TextBasedLayerColumn[] | DatatableColumn[],
  selectedColumnType?: string
): boolean {
  // check if at least one numeric field exists
  const hasNumberTypeColumns = columns?.some(isNumeric);
  return !hasNumberTypeColumns || (hasNumberTypeColumns && selectedColumnType === 'number');
}

export function canColumnBeUsedBeInMetricDimension(
  columns: TextBasedLayerColumn[] | DatatableColumn[],
  selectedColumnType?: string
): boolean {
  // check if at least one numeric field exists
  const hasNumberTypeColumns = columns?.some(isNumeric);
  return (
    !hasNumberTypeColumns ||
    columns.length >= MAX_NUM_OF_COLUMNS ||
    (hasNumberTypeColumns && selectedColumnType === 'number')
  );
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
