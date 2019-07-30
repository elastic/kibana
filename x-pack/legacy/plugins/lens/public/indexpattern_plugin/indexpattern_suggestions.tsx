/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { DatasourceSuggestion } from '../types';
import { buildColumn, getOperationTypesForField } from './operations';
import { generateId } from '../id_generator';
import { hasField } from './utils';
import {
  IndexPatternPrivateState,
  IndexPatternField,
  IndexPatternLayer,
  columnToOperation,
} from './indexpattern';

function buildSuggestion(
  state: IndexPatternPrivateState,
  layerId: string,
  isMultiRow: boolean = true,
  datasourceSuggestionId: number = 0
) {
  const columnOrder = state.layers[layerId].columnOrder;
  const columns = state.layers[layerId].columns;
  return {
    state,

    table: {
      columns: columnOrder.map(columnId => ({
        columnId,
        operation: columnToOperation(columns[columnId]),
      })),
      isMultiRow,
      datasourceSuggestionId,
      layerId,
    },
  };
}

function getIndexPatternIdFromField(
  state: IndexPatternPrivateState,
  field: IndexPatternField
): string | null {
  if (state.currentIndexPatternId && state.indexPatterns[state.currentIndexPatternId]) {
    const isMatchingActive = state.indexPatterns[state.currentIndexPatternId].fields.findIndex(f =>
      _.isEqual(f, field)
    );

    if (isMatchingActive !== -1) {
      return state.currentIndexPatternId;
    }
  }

  const matchingIndexPattern = Object.values(state.indexPatterns).find(indexPattern => {
    if (indexPattern.id === state.currentIndexPatternId) {
      return;
    }

    const hasMatch = indexPattern.fields.findIndex(f => _.isEqual(f, field));

    if (hasMatch !== -1) {
      return indexPattern.id;
    }
  });

  return matchingIndexPattern ? matchingIndexPattern.id : null;
}

export function getDatasourceSuggestionsForField(
  state: IndexPatternPrivateState,
  item: IndexPatternField
): Array<DatasourceSuggestion<IndexPatternPrivateState>> {
  const layers = Object.keys(state.layers);
  const field: IndexPatternField = item as IndexPatternField;

  const indexPatternId = getIndexPatternIdFromField(state, field);

  let layerId;
  let layer: IndexPatternLayer;

  if (indexPatternId) {
    layerId = layers.find(id => state.layers[id].indexPatternId === indexPatternId);
  }

  const operations = getOperationTypesForField(field);
  const hasBucket = operations.find(op => op === 'date_histogram' || op === 'terms');

  if (!layerId) {
    // The field we're suggesting on might not match any existing layer. This will always add
    // a new layer if possible, but that might not be desirable if the layers are too complicated
    // already
    layerId = generateId();
    layer = {
      indexPatternId: state.currentIndexPatternId,
      columnOrder: [],
      columns: {},
    };
  } else {
    layer = state.layers[layerId];
    const indexPattern = state.indexPatterns[layer.indexPatternId];
    if (layer.columnOrder.length) {
      const fieldInUse = Object.values(layer.columns).some(
        column => hasField(column) && column.sourceField === field.name
      );
      if (hasBucket && !fieldInUse) {
        const newColumn = buildColumn({
          op: hasBucket,
          columns: layer.columns,
          layerId,
          indexPattern,
          suggestedPriority: undefined,
          field,
        });
        const newColumnId = generateId();
        const updatedColumns = {
          ...state.layers[layerId].columns,
          [newColumnId]: newColumn,
        };

        let updatedColumnOrder: string[] = [];
        if (hasBucket === 'terms') {
          // prepend terms field
          updatedColumnOrder = [newColumnId, ...layer.columnOrder];
        } else {
          const oldDateHistogramColumn = layer.columnOrder.find(
            columnId => layer.columns[columnId].operationType === 'date_histogram'
          );
          if (oldDateHistogramColumn) {
            // replace existing date histogram
            delete updatedColumns[oldDateHistogramColumn];
            updatedColumnOrder = layer.columnOrder.map(columnId =>
              columnId !== oldDateHistogramColumn ? columnId : newColumnId
            );
          } else {
            // put date histogram as last bucket column
            const bucketedColumns = layer.columnOrder.filter(
              columnId => layer.columns[columnId].isBucketed
            );
            const metricColumns = layer.columnOrder.filter(
              columnId => !layer.columns[columnId].isBucketed
            );
            updatedColumnOrder = [...bucketedColumns, newColumnId, ...metricColumns];
          }
        }

        return [
          buildSuggestion(
            {
              ...state,
              layers: {
                ...state.layers,
                [layerId]: {
                  indexPatternId: state.currentIndexPatternId,
                  columns: updatedColumns,
                  columnOrder: updatedColumnOrder,
                },
              },
            },
            layerId
          ),
        ];
      } else if (!hasBucket && operations.length > 0) {
        const operationsAlreadyAppliedToThisField = Object.values(layer.columns)
          .filter(column => hasField(column) && column.sourceField === field.name)
          .map(column => column.operationType);
        const operationCandidate = operations.find(
          operation => !operationsAlreadyAppliedToThisField.includes(operation)
        );

        if (!operationCandidate) {
          return [];
        }

        // add metric aggregation to the end of the table
        const newColumn = buildColumn({
          op: operationCandidate,
          columns: layer.columns,
          layerId,
          indexPattern,
          suggestedPriority: undefined,
          field,
        });
        const newColumnId = generateId();
        const updatedColumns = {
          ...state.layers[layerId].columns,
          [newColumnId]: newColumn,
        };
        const updatedColumnOrder = [...state.layers[layerId].columnOrder, newColumnId];

        return [
          buildSuggestion(
            {
              ...state,
              layers: {
                ...state.layers,
                [layerId]: {
                  indexPatternId: state.currentIndexPatternId,
                  columns: updatedColumns,
                  columnOrder: updatedColumnOrder,
                },
              },
            },
            layerId
          ),
        ];
      }
      return [];
    }
  }

  if (hasBucket) {
    const countColumn = buildColumn({
      op: 'count',
      columns: layer.columns,
      indexPattern: state.indexPatterns[state.currentIndexPatternId],
      layerId,
      suggestedPriority: undefined,
    });

    // let column know about count column
    const column = buildColumn({
      layerId,
      op: hasBucket,
      indexPattern: state.indexPatterns[state.currentIndexPatternId],
      columns: {
        col2: countColumn,
      },
      field,
      suggestedPriority: undefined,
    });

    return [
      buildSuggestion(
        {
          ...state,
          layers: {
            ...state.layers,
            [layerId]: {
              indexPatternId: state.currentIndexPatternId,
              columns: {
                col1: column,
                col2: countColumn,
              },
              columnOrder: ['col1', 'col2'],
            },
          },
        },
        layerId
      ),
    ];
  } else if (state.indexPatterns[state.currentIndexPatternId].timeFieldName) {
    const currentIndexPattern = state.indexPatterns[state.currentIndexPatternId];
    const dateField = currentIndexPattern.fields.find(
      f => f.name === currentIndexPattern.timeFieldName
    )!;

    const column = buildColumn({
      op: operations[0],
      columns: layer.columns,
      suggestedPriority: undefined,
      field,
      indexPattern: state.indexPatterns[state.currentIndexPatternId],
      layerId,
    });

    const dateColumn = buildColumn({
      op: 'date_histogram',
      columns: layer.columns,
      suggestedPriority: undefined,
      field: dateField,
      indexPattern: state.indexPatterns[state.currentIndexPatternId],
      layerId,
    });

    return [
      buildSuggestion(
        {
          ...state,
          layers: {
            ...state.layers,
            [layerId]: {
              ...layer,
              columns: {
                col1: dateColumn,
                col2: column,
              },
              columnOrder: ['col1', 'col2'],
            },
          },
        },
        layerId
      ),
    ];
  }

  return [];
}

export function getDatasourceSuggestionsFromCurrentState(
  state: IndexPatternPrivateState
): Array<DatasourceSuggestion<IndexPatternPrivateState>> {
  const layers = Object.entries(state.layers);

  return layers
    .map(([layerId, layer], index) => {
      if (layer.columnOrder.length === 0) {
        return;
      }

      return buildSuggestion(state, layerId, true, index);
    })
    .reduce((prev, current) => (current ? prev.concat([current]) : prev), [] as Array<
      DatasourceSuggestion<IndexPatternPrivateState>
    >);
}
