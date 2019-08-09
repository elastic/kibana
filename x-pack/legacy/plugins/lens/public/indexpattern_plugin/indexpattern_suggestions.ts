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
  IndexPatternColumn,
} from './indexpattern';
import { buildColumn, getOperationTypesForField } from './operations';
import { hasField } from './utils';

// A layer structure that makes suggestion generation a bit cleaner
interface Layer {
  id: string;
  columns: IndexPatternColumn[];
  indexPatternId: string;
  columnMap: Record<string, IndexPatternColumn>;
}

// The options passed into the suggestion generation functions.
interface SuggestionContext {
  indexPatterns: Record<string, IndexPattern>;
  layers: Layer[];
  datasourceSuggestionId: number;
}

function isMetric(column: IndexPatternColumn) {
  return !column.isBucketed && column.dataType === 'number';
}

// Generate a single metric suggestion, if there isn't one already in the layers
function suggestMetric({
  indexPatterns,
  layers,
  datasourceSuggestionId,
}: SuggestionContext): DatasourceSuggestion<IndexPatternPrivateState> | undefined {
  // If we already have something like a metric, we don't need
  // to suggest a new one.
  if (layers.some(l => l.columns.length === 1 && isMetric(Object.values(l.columns)[0]))) {
    return;
  }

  const layer = layers.find(l => !!l.columns.some(isMetric));

  if (!layer) {
    return;
  }

  const column = layer.columns.find(isMetric)!;
  const columnId = 'metric';

  return {
    table: {
      layerId: layer.id,
      datasourceSuggestionId,
      columns: [
        {
          columnId,
          operation: columnToOperation(column),
        },
      ],
      isMultiRow: false,
    },
    state: {
      currentIndexPatternId: layer.indexPatternId,
      indexPatterns,
      layers: {
        [layer.id]: {
          columnOrder: [columnId],
          columns: { metric: column },
          indexPatternId: layer.indexPatternId,
        },
      },
    },
  };
}

// Generate a histogram suggestion, if there isn't one already in the layers
function suggestHistogram({
  indexPatterns,
  layers,
  datasourceSuggestionId,
}: SuggestionContext): DatasourceSuggestion<IndexPatternPrivateState> | undefined {
  // If we already have something like a histogram, we don't need
  // to suggest a new one.
  if (layers.some(l => l.columns.length > 1 && l.columns.some(c => c.isBucketed))) {
    return;
  }

  const findDateField = (l: Layer) =>
    indexPatterns[l.indexPatternId].fields.find(f => f.aggregatable && f.type === 'date');

  const layer = layers.find(l => l.columns.find(isMetric) && findDateField(l));

  if (!layer) {
    return;
  }

  const column = layer.columns.find(isMetric)!;
  const bucketableField = findDateField(layer);

  if (!column || !bucketableField) {
    return;
  }

  const bucketColumn = buildColumn({
    op: getOperationTypesForField(bucketableField)[0],
    columns: layer.columnMap,
    layerId: layer.id,
    indexPattern: indexPatterns[layer.indexPatternId],
    suggestedPriority: undefined,
    field: bucketableField,
  });

  return {
    table: {
      datasourceSuggestionId,
      columns: [
        {
          columnId: 'histogram',
          operation: columnToOperation(bucketColumn),
        },
        {
          columnId: 'metric',
          operation: columnToOperation(column),
        },
      ],
      isMultiRow: true,
      layerId: layer.id,
    },
    state: {
      indexPatterns,
      currentIndexPatternId: layer.indexPatternId,
      layers: {
        [layer.id]: {
          columnOrder: ['histogram', 'metric'],
          columns: {
            histogram: bucketColumn,
            metric: column,
          },
          indexPatternId: layer.indexPatternId,
        },
      },
    },
  };
}

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
  indexPatternId: string,
  field: IndexPatternField
): Array<DatasourceSuggestion<IndexPatternPrivateState>> {
  const layers = Object.keys(state.layers);
  const layerIds = layers.filter(id => state.layers[id].indexPatternId === indexPatternId);

  if (layerIds.length === 0) {
    // The field we're suggesting on does not match any existing layer. This will always add
    // a new layer if possible, but that might not be desirable if the layers are too complicated
    // already
    return getEmptyLayerSuggestionsForField(state, generateId(), indexPatternId, field);
  } else {
    const mostEmptyLayerId = _.min(layerIds, layerId => state.layers[layerId].columnOrder.length);
    if (state.layers[mostEmptyLayerId].columnOrder.length === 0) {
      return getEmptyLayerSuggestionsForField(state, mostEmptyLayerId, indexPatternId, field);
    } else {
      return getExistingLayerSuggestionsForField(state, mostEmptyLayerId, field);
    }
  }
}

function getBucketOperationTypes(field: IndexPatternField) {
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
  const usableAsBucketOperation = getBucketOperationTypes(field);
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
    indexPatternId: indexPattern.id,
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
  const applicableBucketOperation = getBucketOperationTypes(field);
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
    indexPatternId: indexPattern.id,
    columns: updatedColumns,
    columnOrder: updatedColumnOrder,
  };
}

function getEmptyLayerSuggestionsForField(
  state: IndexPatternPrivateState,
  layerId: string,
  indexPatternId: string,
  field: IndexPatternField
) {
  const indexPattern = state.indexPatterns[indexPatternId];
  let newLayer: IndexPatternLayer | undefined;
  if (getBucketOperationTypes(field)) {
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
    op: getBucketOperationTypes(field),
    indexPattern,
    columns: {
      col2: countColumn,
    },
    field,
    suggestedPriority: undefined,
  });

  return {
    indexPatternId: indexPattern.id,
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

export function getDatasourceSuggestionsFromCurrentState(state: IndexPatternPrivateState) {
  const layers = Object.entries(state.layers).map(([id, layer]) => ({
    id,
    indexPatternId: layer.indexPatternId,
    columnMap: layer.columns,
    columns: Object.values(layer.columns),
  }));
  const [firstLayer] = layers.filter(({ columns }) => columns.length > 0);
  const suggestions: Array<DatasourceSuggestion<IndexPatternPrivateState>> = [];

  const histogramSuggestion = suggestHistogram({
    layers,
    indexPatterns: state.indexPatterns,
    datasourceSuggestionId: 1,
  });

  const metricSuggestion = suggestMetric({
    layers,
    indexPatterns: state.indexPatterns,
    datasourceSuggestionId: 2,
  });

  if (firstLayer) {
    suggestions.push(
      buildSuggestion({
        state,
        layerId: firstLayer.id,
        isMultiRow: true,
        datasourceSuggestionId: 3,
      })
    );
  }

  if (histogramSuggestion) {
    suggestions.push(histogramSuggestion);
  }

  if (metricSuggestion) {
    suggestions.push(metricSuggestion);
  }

  return suggestions;
}
