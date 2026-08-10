/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DataType,
  BaseIndexPatternColumn,
  FieldBasedIndexPatternColumn,
  FormBasedLayer,
  GenericIndexPatternColumn,
  IndexPattern,
  IndexPatternField,
  VisualizationDimensionGroupConfig,
} from '@kbn/lens-common';

/**
 * Normalizes the specified operation type. (e.g. document operations
 * produce 'number')
 */
export function normalizeOperationDataType(type: DataType) {
  if (type === 'histogram') return 'number';
  return type === 'document' ? 'number' : type;
}

export function hasField(column: BaseIndexPatternColumn): column is FieldBasedIndexPatternColumn {
  return 'sourceField' in column;
}

export function shouldShowTimeSeriesOption(
  layer: FormBasedLayer,
  indexPattern: IndexPattern,
  groupId: string,
  dimensionGroups: VisualizationDimensionGroupConfig[]
) {
  return Boolean(
    dimensionGroups.find(({ groupId: id }) => groupId === id)?.isBreakdownDimension &&
      containsColumnWithTimeSeriesMetric(layer, indexPattern)
  );
}

function containsColumnWithTimeSeriesMetric(
  layer: FormBasedLayer,
  indexPattern: IndexPattern
): boolean {
  return Object.values(layer.columns).some(
    (column) =>
      hasField(column) && indexPattern.getFieldByName(column.sourceField)?.timeSeriesMetric
  );
}

export function getFieldType(field: IndexPatternField) {
  if (field.timeSeriesMetric) {
    return field.timeSeriesMetric;
  }
  return field.type;
}

export function getReferencedField(
  column: GenericIndexPatternColumn | undefined,
  indexPattern: IndexPattern,
  layer: FormBasedLayer
) {
  if (!column) return;
  if (!('references' in column)) return;
  const referencedColumn = layer.columns[column.references[0]];
  if (!referencedColumn || !hasField(referencedColumn)) return;
  return indexPattern.getFieldByName(referencedColumn.sourceField);
}

export function sortByField<C extends BaseIndexPatternColumn>(columns: C[]) {
  return [...columns].sort((column1, column2) => {
    if (hasField(column1) && hasField(column2)) {
      return column1.sourceField.localeCompare(column2.sourceField);
    }
    return column1.operationType.localeCompare(column2.operationType);
  });
}

/**
 * Returns the single value from a Set if it has exactly one element, otherwise undefined.
 * Useful when auto-selecting the only available option.
 */
export function getSingleValue<T>(set: Set<T> | undefined): T | undefined {
  if (!set || set.size !== 1) return undefined;
  return set.values().next().value;
}

/**
 * Returns the first value from a non-empty Set, or undefined if the Set is empty/undefined.
 * Useful as a fallback when any available option will do.
 */
export function getFirstValue<T>(set: Set<T> | undefined): T | undefined {
  if (!set || set.size === 0) return undefined;
  return set.values().next().value;
}
