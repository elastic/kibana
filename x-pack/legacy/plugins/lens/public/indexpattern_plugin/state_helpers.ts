/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { isColumnTransferable } from './operations';
import { operationDefinitionMap, IndexPatternColumn } from './operations';
import { IndexPattern, IndexPatternPrivateState, IndexPatternLayer } from './types';

export function updateColumnParam<
  C extends IndexPatternColumn & { params: object },
  K extends keyof C['params']
>({
  state,
  layerId,
  currentColumn,
  paramName,
  value,
}: {
  state: IndexPatternPrivateState;
  layerId: string;
  currentColumn: C;
  paramName: K;
  value: C['params'][K];
}): IndexPatternPrivateState {
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
          [columnId]: {
            ...currentColumn,
            params: {
              ...currentColumn.params,
              [paramName]: value,
            },
          },
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
      const currentColumn = newColumns[currentColumnId];
      const operationDefinition = operationDefinitionMap[currentColumn.operationType];
      newColumns[currentColumnId] = operationDefinition.onOtherColumnChanged
        ? operationDefinition.onOtherColumnChanged(currentColumn, newColumns)
        : currentColumn;
    }
  });
  return newColumns;
}

export function changeColumn<C extends IndexPatternColumn>({
  state,
  layerId,
  columnId,
  newColumn,
  keepParams = true,
}: {
  state: IndexPatternPrivateState;
  layerId: string;
  columnId: string;
  newColumn: C;
  keepParams?: boolean;
}): IndexPatternPrivateState {
  const oldColumn = state.layers[layerId].columns[columnId];

  const updatedColumn =
    keepParams &&
    oldColumn &&
    oldColumn.operationType === newColumn.operationType &&
    'params' in oldColumn
      ? { ...newColumn, params: oldColumn.params }
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
  const hypotheticalColumns = { ...state.layers[layerId].columns };
  delete hypotheticalColumns[columnId];

  const newColumns = adjustColumnReferencesForChangedColumn(hypotheticalColumns, columnId);

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

export function updateLayerIndexPattern(
  layer: IndexPatternLayer,
  newIndexPattern: IndexPattern
): IndexPatternLayer {
  const keptColumns: IndexPatternLayer['columns'] = _.pick(layer.columns, column =>
    isColumnTransferable(column, newIndexPattern)
  );
  const newColumns: IndexPatternLayer['columns'] = _.mapValues(keptColumns, column => {
    const operationDefinition = operationDefinitionMap[column.operationType];
    return operationDefinition.transfer
      ? operationDefinition.transfer(column, newIndexPattern)
      : column;
  });
  const newColumnOrder = layer.columnOrder.filter(columnId => newColumns[columnId]);

  return {
    ...layer,
    indexPatternId: newIndexPattern.id,
    columns: newColumns,
    columnOrder: newColumnOrder,
  };
}
