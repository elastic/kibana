/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { generateId } from '../id_generator';
import { DatasourceSuggestion, TableChangeType, TableSuggestion } from '../types';
import {
  columnToOperation,
  IndexPatternField,
  IndexPatternLayer,
  IndexPatternPrivateState,
  IndexPattern,
  OperationType,
  IndexPatternColumn,
} from './indexpattern';
import { buildColumn, getOperationTypesForField, operationDefinitionMap } from './operations';
import { hasField } from './utils';

function buildSuggestion({
  state,
  updatedLayer,
  layerId,
  isMultiRow,
  datasourceSuggestionId,
  label,
  changeType,
}: {
  state: IndexPatternPrivateState;
  layerId: string;
  changeType: TableChangeType;
  updatedLayer?: IndexPatternLayer;
  isMultiRow?: boolean;
  datasourceSuggestionId?: number;
  label?: string;
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
      isMultiRow: typeof isMultiRow === 'undefined' || isMultiRow,
      datasourceSuggestionId: datasourceSuggestionId || 0,
      layerId,
      changeType,
      label,
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
          changeType: 'extended',
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
          changeType: 'initial',
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

  const col1 = generateId();
  const col2 = generateId();

  // let column know about count column
  const column = buildColumn({
    layerId,
    op: getBucketOperation(field),
    indexPattern,
    columns: {
      [col2]: countColumn,
    },
    field,
    suggestedPriority: undefined,
  });

  return {
    indexPatternId: indexPattern.id,
    columns: {
      [col1]: column,
      [col2]: countColumn,
    },
    columnOrder: [col1, col2],
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

  const col1 = generateId();
  const col2 = generateId();

  return {
    indexPatternId: indexPattern.id,
    columns: {
      [col1]: dateColumn,
      [col2]: column,
    },
    columnOrder: [col1, col2],
  };
}

export function getDatasourceSuggestionsFromCurrentState(
  state: IndexPatternPrivateState
): Array<DatasourceSuggestion<IndexPatternPrivateState>> {
  return _.flatten(
    Object.entries(state.layers || {})
      .filter(([_id, layer]) => layer.columnOrder.length)
      .map(([layerId, layer], index) => {
        if (layer.columnOrder.length === 0) {
          return [];
        }

        const indexPattern = state.indexPatterns[layer.indexPatternId];
        const onlyMetric = layer.columnOrder.every(columnId => !layer.columns[columnId].isBucketed);
        const onlyBucket = layer.columnOrder.every(columnId => layer.columns[columnId].isBucketed);
        const timeDimension = layer.columnOrder.find(
          columnId =>
            layer.columns[columnId].isBucketed && layer.columns[columnId].dataType === 'date'
        );
        if (onlyBucket) {
          // intermediary chart, don't try to suggest reduced versions
          return buildSuggestion({
            state,
            layerId,
            isMultiRow: false,
            datasourceSuggestionId: index,
            changeType: 'unchanged',
          });
        }

        if (onlyMetric) {
          if (indexPattern.timeFieldName) {
            const newId = generateId();
            const timeColumn = buildColumn({
              layerId,
              op: 'date_histogram',
              indexPattern,
              columns: layer.columns,
              field: indexPattern.fields.find(({ name }) => name === indexPattern.timeFieldName),
              suggestedPriority: undefined,
            });
            const updatedLayer = buildLayerByColumnOrder(
              { ...layer, columns: { ...layer.columns, [newId]: timeColumn } },
              [newId, ...layer.columnOrder]
            );
            return buildSuggestion({
              state,
              layerId,
              isMultiRow: true,
              updatedLayer,
              datasourceSuggestionId: index,
              // TODO i18n
              label: 'over time',
              changeType: 'extended',
            });
          }
          // suggest only metric
          return buildSuggestion({
            state,
            layerId,
            isMultiRow: false,
            datasourceSuggestionId: index,
            changeType: 'unchanged',
          });
        }

        const simplifiedSuggestions = createSimplifiedTableSuggestions(state, layerId);

        if (!timeDimension && indexPattern.timeFieldName) {
          const newId = generateId();
          const availableBucketedColumns = layer.columnOrder.filter(
            columnId => layer.columns[columnId].isBucketed
          );
          const availableMetricColumns = layer.columnOrder.filter(
            columnId => !layer.columns[columnId].isBucketed
          );
          const timeColumn = buildColumn({
            layerId,
            op: 'date_histogram',
            indexPattern,
            columns: layer.columns,
            field: indexPattern.fields.find(({ name }) => name === indexPattern.timeFieldName),
            suggestedPriority: undefined,
          });
          const updatedLayer = buildLayerByColumnOrder(
            { ...layer, columns: { ...layer.columns, [newId]: timeColumn } },
            [...availableBucketedColumns, newId, ...availableMetricColumns]
          );
          const timedSuggestion = buildSuggestion({
            state,
            layerId,
            isMultiRow: true,
            updatedLayer,
            // TODO i18n
            label: 'over time',
            changeType: 'extended',
          });
          return [...simplifiedSuggestions, timedSuggestion];
        }

        return simplifiedSuggestions;
      })
  ).map(
    (suggestion, index): DatasourceSuggestion<IndexPatternPrivateState> => ({
      ...suggestion,
      table: { ...suggestion.table, datasourceSuggestionId: index },
    })
  );
}

function createSimplifiedTableSuggestions(state: IndexPatternPrivateState, layerId: string) {
  const layer = state.layers[layerId];
  const indexPattern = state.indexPatterns[layer.indexPatternId];

  const availableBucketedColumns = layer.columnOrder.filter(
    columnId => layer.columns[columnId].isBucketed
  );
  const availableMetricColumns = layer.columnOrder.filter(
    columnId => !layer.columns[columnId].isBucketed
  );

  return _.flatten(
    availableBucketedColumns.map((_col, index) => {
      const bucketedColumns = availableBucketedColumns.slice(0, index + 1);
      const allMetricsSuggestion = buildLayerByColumnOrder(layer, [
        ...bucketedColumns,
        ...availableMetricColumns,
      ]);

      if (availableMetricColumns.length > 1) {
        return [
          allMetricsSuggestion,
          buildLayerByColumnOrder(layer, [...bucketedColumns, availableMetricColumns[0]]),
        ];
      } else {
        return allMetricsSuggestion;
      }
    })
  )
    .concat(
      availableMetricColumns.map(columnId => {
        let column = layer.columns[columnId];
        // if field based, suggest different metric
        if (hasField(column)) {
          const field = indexPattern.fields.find(
            ({ name }) => hasField(column) && column.sourceField === name
          )!;
          const alternativeMetricOperations = getOperationTypesForField(field).filter(
            operationType => operationType !== column.operationType
          );
          if (alternativeMetricOperations.length > 0) {
            column = buildColumn({
              op: alternativeMetricOperations[0],
              columns: layer.columns,
              indexPattern,
              layerId,
              field,
              suggestedPriority: undefined,
            });
          }
          return buildLayerByColumnOrder(
            {
              ...layer,
              columns: {
                [columnId]: column,
              },
            },
            [columnId]
          );
        } else {
          return buildLayerByColumnOrder(layer, [columnId]);
        }
      })
    )
    .map(updatedLayer => {
      return buildSuggestion({
        state,
        layerId,
        isMultiRow: updatedLayer.columnOrder.length > 1,
        updatedLayer,
        changeType:
          layer.columnOrder.length === updatedLayer.columnOrder.length ? 'unchanged' : 'reduced',
        label:
          updatedLayer.columnOrder.length === 1
            ? getMetricSuggestionTitle(updatedLayer, availableMetricColumns.length === 1)
            : getBucketSuggestionTitle(updatedLayer),
      });
    });
}

function getMetricSuggestionTitle(layer: IndexPatternLayer, onlyMetric: boolean) {
  const { operationType, label } = Object.values(layer.columns)[0];
  // TODO i18n
  if (onlyMetric) {
    return `${operationDefinitionMap[operationType].displayName} overall`;
  } else {
    return `${label} overall`;
  }
}

function getBucketSuggestionTitle(layer: IndexPatternLayer) {
  const { operationType } = layer.columns[
    layer.columnOrder.find(columnId => layer.columns[columnId].isBucketed)!
  ];
  // TODO i18n
  return `By ${operationDefinitionMap[operationType].displayName}`;
}

function buildLayerByColumnOrder(
  layer: IndexPatternLayer,
  columnOrder: string[]
): IndexPatternLayer {
  return {
    ...layer,
    columns: _.pick(layer.columns, columnOrder),
    columnOrder,
  };
}
