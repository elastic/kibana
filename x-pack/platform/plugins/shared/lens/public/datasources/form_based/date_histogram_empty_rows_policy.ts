/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DateHistogramIndexPatternColumn, GenericIndexPatternColumn } from '@kbn/lens-common';
import { getDateHistogramEmptyRowsPolicyForVisualizationState } from '@kbn/lens-common';

interface FormBasedLayerStateLike {
  layers: Record<
    string,
    {
      columns: Record<string, GenericIndexPatternColumn>;
    }
  >;
}

interface StateWithLayers {
  layers?: unknown;
}

const isFormBasedLayerStateLike = (
  datasourceState: unknown
): datasourceState is FormBasedLayerStateLike => {
  if (!datasourceState || typeof datasourceState !== 'object') {
    return false;
  }

  const { layers } = datasourceState as StateWithLayers;
  return Boolean(layers && typeof layers === 'object');
};

const isDateHistogramColumn = (
  column: GenericIndexPatternColumn
): column is DateHistogramIndexPatternColumn => column.operationType === 'date_histogram';

const hasExplicitIncludeEmptyRowsValue = (column: DateHistogramIndexPatternColumn) =>
  typeof column.params?.includeEmptyRows === 'boolean';

export const applyDateHistogramEmptyRowsPolicyToDatasourceState = (
  datasourceState: unknown,
  visualizationType: string | null | undefined,
  visualizationState: unknown
) => {
  const policy = getDateHistogramEmptyRowsPolicyForVisualizationState(
    visualizationType,
    visualizationState
  );

  if (!policy || !isFormBasedLayerStateLike(datasourceState)) {
    return datasourceState;
  }

  let hasChanges = false;

  const layers = Object.fromEntries(
    Object.entries(datasourceState.layers).map(([layerId, layer]) => {
      let layerHasChanges = false;

      const columns = Object.fromEntries(
        Object.entries(layer.columns).map(([columnId, column]) => {
          if (!isDateHistogramColumn(column) || hasExplicitIncludeEmptyRowsValue(column)) {
            return [columnId, column];
          }

          hasChanges = true;
          layerHasChanges = true;

          return [
            columnId,
            {
              ...column,
              params: {
                ...(column.params ?? {}),
                includeEmptyRows: policy.defaultValue,
              },
            },
          ];
        })
      );

      return [layerId, layerHasChanges ? { ...layer, columns } : layer];
    })
  );

  return hasChanges ? { ...datasourceState, layers } : datasourceState;
};
