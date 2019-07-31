/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { generateId } from '../id_generator';
import { DatasourceSuggestion } from '../types';
import {
  columnToOperation,
  IndexPatternField,
  IndexPatternLayer,
  IndexPatternPrivateState,
  IndexPattern,
} from './indexpattern';
import { buildColumn, getOperationTypesForField } from './operations';
import { hasField } from './utils';

function buildSuggestion({
  state,
  updatedLayer,
  layerId,
  isMultiRow,
  datasourceSuggestionId,
}: {
  state: IndexPatternPrivateState;
  layerId: string;
  updatedLayer?: IndexPatternLayer;
  isMultiRow?: boolean;
  datasourceSuggestionId?: number;
}) {
  const columnOrder = (updatedLayer || state.layers[layerId]).columnOrder;
  const columns = (updatedLayer || state.layers[layerId]).columns;
  return {
    state: updatedLayer
      ? {
          ...state,
          layers: {
            ...state.layers,
            [layerId]: updatedLayer,
          },
        }
      : state,

    table: {
      columns: columnOrder.map(columnId => ({
        columnId,
        operation: columnToOperation(columns[columnId]),
      })),
      isMultiRow: isMultiRow || true,
      datasourceSuggestionId: datasourceSuggestionId || 0,
      layerId,
    },
  };
}

export function getDatasourceSuggestionsForField(
  state: IndexPatternPrivateState,
  field: IndexPatternField
): Array<DatasourceSuggestion<IndexPatternPrivateState>> {
  const layers = Object.keys(state.layers);
  const layerIds = layers.filter(id => state.layers[id].indexPatternId === field.indexPatternId);

  if (layerIds.length === 0) {
    // The field we're suggesting on does not match any existing layer. This will always add
    // a new layer if possible, but that might not be desirable if the layers are too complicated
    // already
    return getEmptyLayerSuggestionsForField(state, generateId(), field);
  } else {
    const mostEmptyLayerId = _.min(layerIds, layerId => state.layers[layerId].columnOrder.length);
    if (state.layers[mostEmptyLayerId].columnOrder.length === 0) {
      return getEmptyLayerSuggestionsForField(state, mostEmptyLayerId, field);
    } else {
      return getExistingLayerSuggestionsForField(state, mostEmptyLayerId, field);
    }
  }
}

function getBucketOperation(field: IndexPatternField) {
  return getOperationTypesForField(field).find(op => op === 'date_histogram' || op === 'terms');
}

function getExistingLayerSuggestionsForField(
  state: IndexPatternPrivateState,
  layerId: string,
  field: IndexPatternField
) {
  const layer = state.layers[layerId];
  const indexPattern = state.indexPatterns[layer.indexPatternId];
  const operations = getOperationTypesForField(field);
  const usableAsBucketOperation = getBucketOperation(field);
  const fieldInUse = Object.values(layer.columns).some(
    column => hasField(column) && column.sourceField === field.name
  );
  let updatedLayer: IndexPatternLayer | undefined;
  if (usableAsBucketOperation && !fieldInUse) {
    updatedLayer = addFieldAsBucketOperation(layer, layerId, indexPattern, field);
  } else if (!usableAsBucketOperation && operations.length > 0) {
    updatedLayer = addFieldAsMetricOperation(layer, layerId, indexPattern, field);
  }
  return updatedLayer
    ? [
        buildSuggestion({
          state,
          updatedLayer,
          layerId,
        }),
      ]
    : [];
}

function addFieldAsMetricOperation(
  layer: IndexPatternLayer,
  layerId: string,
  indexPattern: IndexPattern,
  field: IndexPatternField
) {
  const operations = getOperationTypesForField(field);
  const operationsAlreadyAppliedToThisField = Object.values(layer.columns)
    .filter(column => hasField(column) && column.sourceField === field.name)
    .map(column => column.operationType);
  const operationCandidate = operations.find(
    operation => !operationsAlreadyAppliedToThisField.includes(operation)
  );

  if (!operationCandidate) {
    return undefined;
  }

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
    ...layer.columns,
    [newColumnId]: newColumn,
  };
  const updatedColumnOrder = [...layer.columnOrder, newColumnId];

  return {
    indexPatternId: field.indexPatternId,
    columns: updatedColumns,
    columnOrder: updatedColumnOrder,
  };
}

function addFieldAsBucketOperation(
  layer: IndexPatternLayer,
  layerId: string,
  indexPattern: IndexPattern,
  field: IndexPatternField
) {
  const applicableBucketOperation = getBucketOperation(field);
  const newColumn = buildColumn({
    op: applicableBucketOperation,
    columns: layer.columns,
    layerId,
    indexPattern,
    suggestedPriority: undefined,
    field,
  });
  const newColumnId = generateId();
  const updatedColumns = {
    ...layer.columns,
    [newColumnId]: newColumn,
  };
  let updatedColumnOrder: string[] = [];
  if (applicableBucketOperation === 'terms') {
    updatedColumnOrder = [newColumnId, ...layer.columnOrder];
  } else {
    const oldDateHistogramColumn = layer.columnOrder.find(
      columnId => layer.columns[columnId].operationType === 'date_histogram'
    );
    if (oldDateHistogramColumn) {
      delete updatedColumns[oldDateHistogramColumn];
      updatedColumnOrder = layer.columnOrder.map(columnId =>
        columnId !== oldDateHistogramColumn ? columnId : newColumnId
      );
    } else {
      const bucketedColumns = layer.columnOrder.filter(
        columnId => layer.columns[columnId].isBucketed
      );
      const metricColumns = layer.columnOrder.filter(
        columnId => !layer.columns[columnId].isBucketed
      );
      updatedColumnOrder = [...bucketedColumns, newColumnId, ...metricColumns];
    }
  }
  return {
    indexPatternId: field.indexPatternId,
    columns: updatedColumns,
    columnOrder: updatedColumnOrder,
  };
}

function getEmptyLayerSuggestionsForField(
  state: IndexPatternPrivateState,
  layerId: string,
  field: IndexPatternField
) {
  const indexPattern = state.indexPatterns[field.indexPatternId];
  let newLayer: IndexPatternLayer | undefined;
  if (getBucketOperation(field)) {
    newLayer = createNewLayerWithBucketAggregation(layerId, indexPattern, field);
  } else if (indexPattern.timeFieldName && getOperationTypesForField(field).length > 0) {
    newLayer = createNewLayerWithMetricAggregation(layerId, indexPattern, field);
  }
  return newLayer
    ? [
        buildSuggestion({
          state,
          updatedLayer: newLayer,
          layerId,
        }),
      ]
    : [];
}

function createNewLayerWithBucketAggregation(
  layerId: string,
  indexPattern: IndexPattern,
  field: IndexPatternField
) {
  const countColumn = buildColumn({
    op: 'count',
    columns: {},
    indexPattern,
    layerId,
    suggestedPriority: undefined,
  });

  // let column know about count column
  const column = buildColumn({
    layerId,
    op: getBucketOperation(field),
    indexPattern,
    columns: {
      col2: countColumn,
    },
    field,
    suggestedPriority: undefined,
  });

  return {
    indexPatternId: field.indexPatternId,
    columns: {
      col1: column,
      col2: countColumn,
    },
    columnOrder: ['col1', 'col2'],
  };
}

function createNewLayerWithMetricAggregation(
  layerId: string,
  indexPattern: IndexPattern,
  field: IndexPatternField
) {
  const dateField = indexPattern.fields.find(f => f.name === indexPattern.timeFieldName)!;

  const operations = getOperationTypesForField(field);
  const column = buildColumn({
    op: operations[0],
    columns: {},
    suggestedPriority: undefined,
    field,
    indexPattern,
    layerId,
  });

  const dateColumn = buildColumn({
    op: 'date_histogram',
    columns: {},
    suggestedPriority: undefined,
    field: dateField,
    indexPattern,
    layerId,
  });

  return {
    indexPatternId: indexPattern.id,
    columns: {
      col1: dateColumn,
      col2: column,
    },
    columnOrder: ['col1', 'col2'],
  };
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

      return buildSuggestion({ state, layerId, isMultiRow: true, datasourceSuggestionId: index });
    })
    .reduce((prev, current) => (current ? prev.concat([current]) : prev), [] as Array<
      DatasourceSuggestion<IndexPatternPrivateState>
    >);
}
