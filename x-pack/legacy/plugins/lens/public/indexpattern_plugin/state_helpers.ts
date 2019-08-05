/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import {
  IndexPatternPrivateState,
  IndexPatternColumn,
  BaseIndexPatternColumn,
  IndexPatternLayer,
  IndexPattern,
} from './indexpattern';
import { operationDefinitionMap, OperationDefinition, isColumnTransferable } from './operations';

export function updateColumnParam<
  C extends BaseIndexPatternColumn & { params: object },
  K extends keyof C['params']
>(
  state: IndexPatternPrivateState,
  layerId: string,
  currentColumn: C,
  paramName: K,
  value: C['params'][K]
): IndexPatternPrivateState {
  const columnId = Object.entries(state.layers[layerId].columns).find(
    ([_columnId, column]) => column === currentColumn
  )![0];

  if (!('params' in state.layers[layerId].columns[columnId])) {
    throw new Error('Invariant: no params in this column');
  }

  return {
    ...state,
    layers: {
      ...state.layers,
      [layerId]: {
        ...state.layers[layerId],
        columns: {
          ...state.layers[layerId].columns,
          [columnId]: ({
            ...currentColumn,
            params: {
              ...currentColumn.params,
              [paramName]: value,
            },
          } as unknown) as IndexPatternColumn,
        },
      },
    },
  };
}

function adjustColumnReferencesForChangedColumn(
  columns: Record<string, IndexPatternColumn>,
  columnId: string
) {
  const newColumns = { ...columns };
  Object.keys(newColumns).forEach(currentColumnId => {
    if (currentColumnId !== columnId) {
      const currentColumn = newColumns[currentColumnId] as BaseIndexPatternColumn;
      const operationDefinition = operationDefinitionMap[
        currentColumn.operationType
      ] as OperationDefinition<BaseIndexPatternColumn>;
      newColumns[currentColumnId] = (operationDefinition.onOtherColumnChanged
        ? operationDefinition.onOtherColumnChanged(currentColumn, newColumns)
        : currentColumn) as IndexPatternColumn;
    }
  });
  return newColumns;
}

export function changeColumn({
  state,
  layerId,
  columnId,
  newColumn,
  keepParams,
}: {
  state: IndexPatternPrivateState;
  layerId: string;
  columnId: string;
  newColumn: IndexPatternColumn;
  keepParams?: boolean;
}): IndexPatternPrivateState {
  const oldColumn = state.layers[layerId].columns[columnId];

  const updatedColumn =
    (typeof keepParams === 'boolean' ? keepParams : true) &&
    oldColumn &&
    oldColumn.operationType === newColumn.operationType &&
    'params' in oldColumn
      ? ({ ...newColumn, params: oldColumn.params } as IndexPatternColumn)
      : newColumn;

  const newColumns = adjustColumnReferencesForChangedColumn(
    {
      ...state.layers[layerId].columns,
      [columnId]: updatedColumn,
    },
    columnId
  );

  return {
    ...state,
    layers: {
      ...state.layers,
      [layerId]: {
        ...state.layers[layerId],
        columnOrder: getColumnOrder(newColumns),
        columns: newColumns,
      },
    },
  };
}

export function deleteColumn({
  state,
  layerId,
  columnId,
}: {
  state: IndexPatternPrivateState;
  layerId: string;
  columnId: string;
}): IndexPatternPrivateState {
  const newColumns = adjustColumnReferencesForChangedColumn(
    state.layers[layerId].columns,
    columnId
  );
  delete newColumns[columnId];

  return {
    ...state,
    layers: {
      ...state.layers,
      [layerId]: {
        ...state.layers[layerId],
        columnOrder: getColumnOrder(newColumns),
        columns: newColumns,
      },
    },
  };
}

export function getColumnOrder(columns: Record<string, IndexPatternColumn>): string[] {
  const entries = Object.entries(columns);

  const [aggregations, metrics] = _.partition(entries, ([id, col]) => col.isBucketed);

  return aggregations
    .sort(([id, col], [id2, col2]) => {
      return (
        // Sort undefined orders last
        (col.suggestedPriority !== undefined ? col.suggestedPriority : Number.MAX_SAFE_INTEGER) -
        (col2.suggestedPriority !== undefined ? col2.suggestedPriority : Number.MAX_SAFE_INTEGER)
      );
    })
    .map(([id]) => id)
    .concat(metrics.map(([id]) => id));
}

export function isLayerTransferable(layer: IndexPatternLayer, newIndexPattern: IndexPattern) {
  return Object.values(layer.columns).every(column =>
    isColumnTransferable(column, newIndexPattern)
  );
}

export function updateLayerIndexPattern(
  layer: IndexPatternLayer,
  newIndexPattern: IndexPattern
): IndexPatternLayer {
  const newColumns: IndexPatternLayer['columns'] = _.pick(layer.columns, column =>
    isColumnTransferable(column, newIndexPattern)
  );
  const newColumnOrder = layer.columnOrder.filter(columnId => newColumns[columnId]);

  return {
    ...layer,
    indexPatternId: newIndexPattern.id,
    columns: newColumns,
    columnOrder: newColumnOrder,
  };
}

export function updateLayerIndexPatterns(
  layers: IndexPatternPrivateState['layers'],
  newIndexPattern: IndexPattern
) {
  const currentlyUsedIndexPatterns = _.uniq(
    Object.values(layers).map(layer => layer.indexPatternId)
  );
  if (
    currentlyUsedIndexPatterns.length === 1 &&
    currentlyUsedIndexPatterns[0] !== newIndexPattern.id
  ) {
    const isTransferable = Object.values(layers).every(layer =>
      isLayerTransferable(layer, newIndexPattern)
    );

    if (isTransferable) {
      return _.mapValues(layers, layer => ({
        ...layer,
        indexPatternId: newIndexPattern.id,
        columns: _.mapValues(layer.columns, column => ({
          ...column,
          indexPatternId: newIndexPattern.id,
        })),
      }));
    }
  }

  return layers;
}
