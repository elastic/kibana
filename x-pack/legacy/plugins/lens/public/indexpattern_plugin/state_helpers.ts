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
  FieldBasedIndexPatternColumn,
} from './indexpattern';

export function getColumnOrder(columns: Record<string, IndexPatternColumn>): string[] {
  const entries = Object.entries(columns);

  const [aggregations, metrics] = _.partition(entries, col => col[1].isBucketed);

  return aggregations
    .sort(([id, col], [id2, col2]) => {
      return (
        // Sort undefined orders last
        (col.suggestedOrder !== undefined ? col.suggestedOrder : Number.MAX_SAFE_INTEGER) -
        (col2.suggestedOrder !== undefined ? col2.suggestedOrder : Number.MAX_SAFE_INTEGER)
      );
    })
    .map(([id]) => id)
    .concat(metrics.map(([id]) => id));
}

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

export function changeColumn(
  state: IndexPatternPrivateState,
  layerId: string,
  columnId: string,
  newColumn: IndexPatternColumn,
  { keepParams }: { keepParams: boolean } = { keepParams: true }
) {
  const oldColumn = state.layers[layerId].columns[columnId];

  const updatedColumn =
    keepParams &&
    oldColumn &&
    oldColumn.operationType === newColumn.operationType &&
    'params' in oldColumn
      ? ({ ...newColumn, params: oldColumn.params } as IndexPatternColumn)
      : newColumn;

  const newColumns: Record<string, IndexPatternColumn> = {
    ...state.layers[layerId].columns,
    [columnId]: updatedColumn,
  };

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

export function deleteColumn(state: IndexPatternPrivateState, layerId: string, columnId: string) {
  // const newColumns: IndexPatternPrivateState['columns'] = {
  //   ...state.columns,
  // };
  const newColumns: Record<string, IndexPatternColumn> = {
    ...state.layers[layerId].columns,
  };
  delete newColumns[columnId];

  // return {
  //   ...state,
  //   columns: newColumns,
  //   columnOrder: getColumnOrder(newColumns),
  // };

  // const newColumns: Record<string, IndexPatternColumn> = {
  //   ...state.layers[layerId].columns,
  //   [columnId]: updatedColumn,
  // };

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

export function hasField(column: BaseIndexPatternColumn): column is FieldBasedIndexPatternColumn {
  return 'sourceField' in column;
}

export function sortByField<C extends BaseIndexPatternColumn>(columns: C[]) {
  return [...columns].sort((column1, column2) => {
    if (hasField(column1) && hasField(column2)) {
      return column1.sourceField.localeCompare(column2.sourceField);
    }
    return column1.operationType.localeCompare(column2.operationType);
  });
}
