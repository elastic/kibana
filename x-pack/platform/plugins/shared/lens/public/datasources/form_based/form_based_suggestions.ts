/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten, minBy, pick, mapValues, partition } from 'lodash';
import { i18n } from '@kbn/i18n';
import type {
  Column,
  AnyColumnWithReferences,
  AnyColumnWithSourceField,
  TermsColumn,
} from '@kbn/visualizations-plugin/common';
import type {
  DatasourceSuggestion,
  IndexPattern,
  IndexPatternField,
  IndexPatternMap,
  TableChangeType,
  VisualizationDimensionGroupConfig,
  NavigateToLensLayer,
  BaseIndexPatternColumn,
  FormulaIndexPatternColumn,
  FormBasedPrivateState,
  FormBasedLayer,
} from '@kbn/lens-common';
import { getReferencedColumnIds } from '@kbn/lens-common';
import { generateId } from '../../id_generator';
import { columnToOperation } from './form_based';
import type { OperationType, ColumnAdvancedParams } from './operations';
import {
  insertNewColumn,
  replaceColumn,
  getMetricOperationTypes,
  getOperationTypesForField,
  operationDefinitionMap,
  getExistingColumnGroups,
  isReferenced,
  hasTermsWithManyBuckets,
  updateColumnLabel,
} from './operations';
import { hasField } from './pure_utils';
import { documentField } from './document_field';
import type { OperationDefinition } from './operations/definitions';
import { insertOrReplaceFormulaColumn } from './operations/definitions/formula';

export type IndexPatternSuggestion = DatasourceSuggestion<FormBasedPrivateState>;

interface ColumnChange {
  op: OperationType;
  columnId: string;
  indexPattern: IndexPattern;
  field?: IndexPatternField;
  visualizationGroups: VisualizationDimensionGroupConfig[];
  columnParams?: Record<string, unknown>;
  references?: ColumnChange[];
  initialParams?: { params: Record<string, unknown> };
  incompleteParams?: ColumnAdvancedParams;
}

function buildSuggestion({
  state,
  updatedLayer,
  layerId,
  label,
  changeType,
}: {
  state: FormBasedPrivateState;
  layerId: string;
  changeType: TableChangeType;
  updatedLayer?: FormBasedLayer;
  label?: string;
}): DatasourceSuggestion<FormBasedPrivateState> {
  const updatedState = updatedLayer
    ? {
        ...state,
        layers: {
          ...state.layers,
          [layerId]: updatedLayer,
        },
      }
    : state;

  // It's fairly easy to accidentally introduce a mismatch between
  // columnOrder and columns, so this is a safeguard to ensure the
  // two match up.
  const layers = mapValues(updatedState.layers, (layer) => ({
    ...layer,
    columns: pick(layer.columns, layer.columnOrder) as Record<string, BaseIndexPatternColumn>,
  }));

  const columnOrder = layers[layerId].columnOrder;
  const columnMap = layers[layerId].columns as Record<string, BaseIndexPatternColumn>;
  const isMultiRow = Object.values(columnMap).some((column) => column.isBucketed);

  return {
    state: {
      ...updatedState,
      layers,
    },

    table: {
      columns: columnOrder
        // Hide any referenced columns from what visualizations know about
        .filter((columnId) => !isReferenced(layers[layerId]!, columnId))
        .map((columnId) => ({
          columnId,
          operation: columnToOperation(columnMap[columnId]),
        })),
      isMultiRow,
      layerId,
      changeType,
      label,
    },

    keptLayerIds: Object.keys(state.layers),
  };
}

export function getDatasourceSuggestionsForField(
  state: FormBasedPrivateState,
  indexPatternId: string,
  field: IndexPatternField,
  indexPatterns: IndexPatternMap,
  filterLayers?: (layerId: string) => boolean
): IndexPatternSuggestion[] {
  const layers = Object.keys(state.layers);
  let layerIds = layers.filter((id) => state.layers[id].indexPatternId === indexPatternId);
  if (filterLayers) {
    layerIds = layerIds.filter(filterLayers);
  }

  if (layerIds.length === 0) {
    // The field we're suggesting on does not match any existing layer.
    // This generates a set of suggestions where we add a layer.
    // A second set of suggestions is generated for visualizations that don't work with layers
    const newId = generateId();
    return getEmptyLayerSuggestionsForField(
      state,
      newId,
      indexPatternId,
      field,
      indexPatterns
    ).concat(
      getEmptyLayerSuggestionsForField(
        { ...state, layers: {} },
        newId,
        indexPatternId,
        field,
        indexPatterns
      )
    );
  } else {
    // The field we're suggesting on matches an existing layer. In this case we find the layer with
    // the fewest configured columns and try to add the field to this table. If this layer does not
    // contain any layers yet, behave as if there is no layer.
    const mostEmptyLayerId = minBy(
      layerIds,
      (layerId) => state.layers[layerId].columnOrder.length
    ) as string;
    if (state.layers[mostEmptyLayerId].columnOrder.length === 0) {
      return getEmptyLayerSuggestionsForField(
        state,
        mostEmptyLayerId,
        indexPatternId,
        field,
        indexPatterns
      );
    } else {
      return getExistingLayerSuggestionsForField(state, mostEmptyLayerId, field, indexPatterns);
    }
  }
}

// Called when the user navigates from Visualize editor to Lens
export function getDatasourceSuggestionsForVisualizeCharts(
  state: FormBasedPrivateState,
  contextLayers: NavigateToLensLayer[],
  indexPatterns: IndexPatternMap
): IndexPatternSuggestion[] {
  return getEmptyLayersSuggestionsForVisualizeCharts(state, contextLayers, indexPatterns);
}

function getEmptyLayersSuggestionsForVisualizeCharts(
  state: FormBasedPrivateState,
  contextLayers: NavigateToLensLayer[],
  indexPatterns: IndexPatternMap
): IndexPatternSuggestion[] {
  const suggestions: IndexPatternSuggestion[] = [];
  contextLayers.forEach((layer) => {
    const indexPattern = indexPatterns[layer.indexPatternId];
    if (!indexPattern) return [];
    const newLayer = createNewLayerWithMetricAggregationFromVizEditor(indexPattern, layer);
    const suggestion = buildSuggestion({
      state,
      updatedLayer: newLayer,
      layerId: layer.layerId,
      changeType: 'initial',
    });
    suggestions.push(suggestion);
  });
  return suggestions;
}

function isReferenceColumn(column: Column): column is AnyColumnWithReferences {
  return 'references' in column && (column as AnyColumnWithReferences).references.length > 0;
}

function isFieldBasedColumn(column: Column): column is AnyColumnWithSourceField {
  return 'sourceField' in column;
}

function isTermsColumn(column: Column): column is TermsColumn {
  return column.operationType === 'terms';
}

function getSourceField(column: Column, indexPattern: IndexPattern) {
  return isFieldBasedColumn(column)
    ? column.sourceField === 'document'
      ? documentField
      : indexPattern.getFieldByName(column.sourceField)
    : undefined;
}

function getParams(column: Column) {
  return {
    ...column.params,
  };
}

function getIncompleteParams(column: Column) {
  return {
    filter: column.filter,
    timeShift: column.timeShift,
    timeScale: column.timeScale,
    dataType: column.dataType,
    ...(column.reducedTimeRange && { reducedTimeRange: column.reducedTimeRange }),
  };
}

function getFieldWithLabel(column: Column, indexPattern: IndexPattern) {
  const field = getSourceField(column, indexPattern);

  if (field && column.label) {
    return { ...field, customLabel: column.label };
  }
  return field;
}

function createColumnChange(column: Column, indexPattern: IndexPattern): ColumnChange {
  return {
    op: column.operationType,
    columnId: column.columnId,
    field: getFieldWithLabel(column, indexPattern),
    indexPattern,
    visualizationGroups: [],
    incompleteParams: getIncompleteParams(column),
    initialParams: {
      params: getParams(column),
    },
    columnParams: getParams(column),
  };
}

function convertToColumnChange(columns: Column[], indexPattern: IndexPattern) {
  return columns.reduce<ColumnChange[]>((acc, column) => {
    if (!columns.some((c) => isReferenceColumn(c) && column.columnId === c.references[0])) {
      const newColumn: ColumnChange = createColumnChange(column, indexPattern);
      if (isReferenceColumn(column)) {
        const referenceColumn = columns.find((c) => c.columnId === column.references[0])!;
        newColumn.references = [createColumnChange(referenceColumn, indexPattern)];
      }
      if (
        isTermsColumn(column) &&
        column.params.orderAgg &&
        newColumn.columnParams &&
        !columns.some((c) => c.columnId === column.params.orderAgg?.columnId)
      ) {
        const orderColumn = column.params.orderAgg;
        const operationDefinition = operationDefinitionMap[orderColumn.operationType];
        const layer: FormBasedLayer = {
          indexPatternId: indexPattern.id,
          columns: {},
          columnOrder: [],
        };
        newColumn.columnParams.orderAgg = operationDefinition.buildColumn(
          {
            previousColumn: {
              ...column.params.orderAgg,
              label: column.params.orderAgg?.label || '',
            },
            indexPattern,
            layer,
            referenceIds: [],
            field: getFieldWithLabel(column.params.orderAgg, indexPattern)!,
          },
          column.params
        );
      }
      acc.push(newColumn);
    }

    return acc;
  }, []);
}

function createNewLayerWithMetricAggregationFromVizEditor(
  indexPattern: IndexPattern,
  layer: NavigateToLensLayer
) {
  const columns = convertToColumnChange(layer.columns as Column[], indexPattern);
  let newLayer: FormBasedLayer = {
    ignoreGlobalFilters: layer.ignoreGlobalFilters,
    indexPatternId: indexPattern.id,
    columns: {},
    columnOrder: [],
  };
  columns.forEach((column) => {
    if (column.op === 'formula') {
      const operationDefinition = operationDefinitionMap.formula as OperationDefinition<
        FormulaIndexPatternColumn,
        'managedReference'
      >;
      const previousColumn = layer.columns.find((c) => c.columnId === column.columnId)!;
      const newColumn = operationDefinition.buildColumn(
        {
          previousColumn: {
            ...previousColumn,
            label: previousColumn?.label || (column.columnParams?.formula as string) || '',
          },
          indexPattern,
          layer: newLayer,
        },
        column.columnParams
      ) as FormulaIndexPatternColumn;
      newLayer = insertOrReplaceFormulaColumn(column.columnId, newColumn, newLayer, {
        indexPattern,
      }).layer;
    } else {
      newLayer = insertNewColumn({
        ...column,
        layer: newLayer,
        respectOrder: true,
      });
    }
  });
  let updatedLayer = newLayer;
  layer.columns.forEach(({ columnId, label: customLabel }) => {
    if (customLabel) {
      updatedLayer = updateColumnLabel({
        layer: updatedLayer,
        columnId,
        customLabel: isReferenced(updatedLayer, columnId) ? '' : customLabel,
      });
    }
  });
  return updatedLayer;
}

// Called when the user navigates from Discover to Lens (Visualize button)
export function getDatasourceSuggestionsForVisualizeField(
  state: FormBasedPrivateState,
  indexPatternId: string,
  fieldName: string,
  indexPatterns: IndexPatternMap
): IndexPatternSuggestion[] {
  const layers = Object.keys(state.layers);
  const layerIds = layers.filter((id) => state.layers[id].indexPatternId === indexPatternId);
  // Identify the field by the indexPatternId and the fieldName
  const indexPattern = indexPatterns[indexPatternId];
  const field = indexPattern?.getFieldByName(fieldName);

  if (layerIds.length !== 0 || !field) return [];
  const newId = generateId();
  return getEmptyLayerSuggestionsForField(
    state,
    newId,
    indexPatternId,
    field,
    indexPatterns
  ).concat(
    getEmptyLayerSuggestionsForField(
      { ...state, layers: {} },
      newId,
      indexPatternId,
      field,
      indexPatterns
    )
  );
}

// TODO: Stop hard-coding the specific operation types
function getBucketOperation(field: IndexPatternField) {
  // We allow numeric bucket types in some cases, but it's generally not the right suggestion,
  // so we eliminate it here.
  if (field.type !== 'number') {
    return getOperationTypesForField(field).find((op) => op === 'date_histogram' || op === 'terms');
  }
}

function getExistingLayerSuggestionsForField(
  state: FormBasedPrivateState,
  layerId: string,
  field: IndexPatternField,
  indexPatterns: IndexPatternMap
) {
  const layer = state.layers[layerId];
  const indexPattern = indexPatterns[layer.indexPatternId];
  const operations = getOperationTypesForField(field);
  const usableAsBucketOperation = getBucketOperation(field);
  const fieldInUse = Object.values(layer.columns).some(
    (column) => hasField(column) && column.sourceField === field.name
  );
  const suggestions: IndexPatternSuggestion[] = [];

  if (usableAsBucketOperation && !fieldInUse) {
    if (
      usableAsBucketOperation === 'date_histogram' &&
      layer.columnOrder.some((colId) => layer.columns[colId].operationType === 'date_histogram')
    ) {
      const previousDate = layer.columnOrder.find(
        (colId) => layer.columns[colId].operationType === 'date_histogram'
      )!;
      suggestions.push(
        buildSuggestion({
          state,
          updatedLayer: replaceColumn({
            layer,
            indexPattern,
            field,
            op: usableAsBucketOperation,
            columnId: previousDate,
            visualizationGroups: [],
          }),
          layerId,
          changeType: 'initial',
        })
      );
    } else {
      suggestions.push(
        buildSuggestion({
          state,
          updatedLayer: insertNewColumn({
            layer,
            indexPattern,
            field,
            op: usableAsBucketOperation,
            columnId: generateId(),
            visualizationGroups: [],
          }),
          layerId,
          changeType: 'extended',
        })
      );
    }
  }

  if (!usableAsBucketOperation && operations.length > 0 && !fieldInUse) {
    const [metricOperation] = getMetricOperationTypes(field);
    if (metricOperation) {
      const layerWithNewMetric = insertNewColumn({
        layer,
        indexPattern,
        field,
        columnId: generateId(),
        op: metricOperation.type as OperationType,
        visualizationGroups: [],
      });
      if (layerWithNewMetric) {
        suggestions.push(
          buildSuggestion({
            state,
            layerId,
            updatedLayer: layerWithNewMetric,
            changeType: 'extended',
          })
        );
      }

      const [, metrics, references] = getExistingColumnGroups(layer);
      // TODO: Write test for the case where we have exactly one metric and one reference. We shouldn't switch the inner metric.
      if (metrics.length === 1 && references.length === 0) {
        const layerWithReplacedMetric = replaceColumn({
          layer,
          indexPattern,
          field,
          columnId: metrics[0],
          op: metricOperation.type as OperationType,
          visualizationGroups: [],
        });
        if (layerWithReplacedMetric) {
          suggestions.push(
            buildSuggestion({
              state,
              layerId,
              updatedLayer: layerWithReplacedMetric,
              changeType: 'extended',
            })
          );
        }
      }
    }
  }

  if (!fieldInUse) {
    const metricSuggestion = createMetricSuggestion(indexPattern, layerId, state, field);
    if (metricSuggestion) {
      suggestions.push(metricSuggestion);
    }
  }

  return suggestions;
}

function getEmptyLayerSuggestionsForField(
  state: FormBasedPrivateState,
  layerId: string,
  indexPatternId: string,
  field: IndexPatternField,
  indexPatterns: IndexPatternMap
): IndexPatternSuggestion[] {
  const indexPattern = indexPatterns[indexPatternId];
  let newLayer: FormBasedLayer | undefined;
  const bucketOperation = getBucketOperation(field);
  if (bucketOperation) {
    newLayer = createNewLayerWithBucketAggregation(indexPattern, field, bucketOperation);
  } else if (indexPattern.timeFieldName && getOperationTypesForField(field).length > 0) {
    newLayer = createNewLayerWithMetricAggregation(indexPattern, field);
  }

  // copy the sampling rate to the new layer
  // or just default to 1
  if (newLayer) {
    newLayer.sampling = state.layers[layerId]?.sampling ?? 1;
  }

  const newLayerSuggestions = newLayer
    ? [
        buildSuggestion({
          state,
          updatedLayer: newLayer,
          layerId,
          changeType: 'initial',
        }),
      ]
    : [];

  const metricLayer = createMetricSuggestion(indexPattern, layerId, state, field);

  return metricLayer ? newLayerSuggestions.concat(metricLayer) : newLayerSuggestions;
}

function createNewLayerWithBucketAggregation(
  indexPattern: IndexPattern,
  field: IndexPatternField,
  operation: OperationType
): FormBasedLayer {
  return insertNewColumn({
    op: operation,
    layer: insertNewColumn({
      op: 'count',
      layer: { indexPatternId: indexPattern.id, columns: {}, columnOrder: [] },
      columnId: generateId(),
      field: documentField,
      indexPattern,
      visualizationGroups: [],
    }),
    columnId: generateId(),
    field,
    indexPattern,
    visualizationGroups: [],
  });
}

function createNewLayerWithMetricAggregation(
  indexPattern: IndexPattern,
  field: IndexPatternField
): FormBasedLayer | undefined {
  const dateField = indexPattern.getFieldByName(indexPattern.timeFieldName!);
  const [metricOperation] = getMetricOperationTypes(field);
  if (!metricOperation) {
    return;
  }

  return insertNewColumn({
    op: 'date_histogram',
    layer: insertNewColumn({
      op: metricOperation.type as OperationType,
      layer: { indexPatternId: indexPattern.id, columns: {}, columnOrder: [] },
      columnId: generateId(),
      field,
      indexPattern,
      visualizationGroups: [],
    }),
    columnId: generateId(),
    field: dateField,
    indexPattern,
    visualizationGroups: [],
  });
}

export function getDatasourceSuggestionsFromCurrentState(
  state: FormBasedPrivateState,
  indexPatterns?: IndexPatternMap,
  filterLayers: (layerId: string) => boolean = () => true
): Array<DatasourceSuggestion<FormBasedPrivateState>> {
  if (!indexPatterns) {
    return [];
  }
  const layers = Object.entries(state.layers || {}).filter(([layerId]) => filterLayers(layerId));

  if (layers.length > 1) {
    // Return suggestions that reduce the data to each layer individually
    return layers
      .map(([layerId, layer], index) => {
        const hasMatchingLayer = layers.some(
          ([otherLayerId, otherLayer]) =>
            otherLayerId !== layerId && otherLayer.indexPatternId === layer.indexPatternId
        );

        const suggestionTitle = hasMatchingLayer
          ? i18n.translate('xpack.lens.indexPatternSuggestion.removeLayerPositionLabel', {
              defaultMessage: 'Show only layer {layerNumber}',
              values: { layerNumber: index + 1 },
            })
          : i18n.translate('xpack.lens.indexPatternSuggestion.removeLayerLabel', {
              defaultMessage: 'Show only {indexPatternTitle}',
              values: { indexPatternTitle: indexPatterns[layer.indexPatternId].title },
            });

        return buildSuggestion({
          state: {
            ...state,
            layers: {
              [layerId]: layer,
            },
          },
          layerId,
          changeType: 'layers',
          label: suggestionTitle,
        });
      })
      .concat([
        buildSuggestion({
          state,
          layerId: layers[0][0],
          changeType: 'unchanged',
        }),
      ]);
  }

  return flatten(
    layers
      .filter(([_id, layer]) => layer.columnOrder.length && layer.indexPatternId)
      .map(([layerId, layer]) => {
        const indexPattern = indexPatterns[layer.indexPatternId];
        const [buckets, metrics, references] = getExistingColumnGroups(layer);
        const timeDimension = layer.columnOrder.find(
          (columnId) =>
            layer.columns[columnId].isBucketed && layer.columns[columnId].dataType === 'date'
        );
        const timeField =
          indexPattern?.timeFieldName && indexPattern.getFieldByName(indexPattern.timeFieldName);

        const hasNumericDimension =
          buckets.length === 1 &&
          buckets.some((columnId) => layer.columns[columnId].dataType === 'number');

        const suggestions: Array<DatasourceSuggestion<FormBasedPrivateState>> = [];

        // Always suggest an unchanged table, including during invalid states
        suggestions.push(
          buildSuggestion({
            state,
            layerId,
            changeType: 'unchanged',
          })
        );

        if (!references.length && metrics.length && buckets.length === 0) {
          if (timeField && buckets.length < 1 && !hasTermsWithManyBuckets(layer)) {
            // suggest current metric over time if there is a default time field
            suggestions.push(
              createSuggestionWithDefaultDateHistogram(state, layerId, timeField, indexPatterns)
            );
          }
          if (indexPattern) {
            suggestions.push(...createAlternativeMetricSuggestions(indexPattern, layerId, state));
          }
        } else {
          suggestions.push(...createSimplifiedTableSuggestions(state, layerId));

          // base range intervals are of number dataType.
          // Custom range/intervals have a different dataType so they still receive the Over Time suggestion
          if (
            !timeDimension &&
            timeField &&
            buckets.length < 2 &&
            !hasNumericDimension &&
            !hasTermsWithManyBuckets(layer)
          ) {
            // suggest current configuration over time if there is a default time field
            // and no time dimension yet
            suggestions.push(
              createSuggestionWithDefaultDateHistogram(state, layerId, timeField, indexPatterns)
            );
          }

          if (buckets.length === 2) {
            suggestions.push(createChangedNestingSuggestion(state, layerId, indexPatterns));
          }
        }
        return suggestions;
      })
  );
}

function createChangedNestingSuggestion(
  state: FormBasedPrivateState,
  layerId: string,
  indexPatterns: IndexPatternMap
) {
  const layer = state.layers[layerId];
  const [firstBucket, secondBucket, ...rest] = layer.columnOrder;
  const updatedLayer = { ...layer, columnOrder: [secondBucket, firstBucket, ...rest] };
  const indexPattern = indexPatterns[state.currentIndexPatternId];
  const firstBucketColumn = layer.columns[firstBucket];
  const firstBucketLabel =
    (hasField(firstBucketColumn) &&
      indexPattern.getFieldByName(firstBucketColumn.sourceField)?.displayName) ||
    '';
  const secondBucketColumn = layer.columns[secondBucket];
  const secondBucketLabel =
    (hasField(secondBucketColumn) &&
      indexPattern.getFieldByName(secondBucketColumn.sourceField)?.displayName) ||
    '';

  return buildSuggestion({
    state,
    layerId,
    updatedLayer,
    label: getNestedTitle([secondBucketLabel, firstBucketLabel]),
    changeType: 'reorder',
  });
}

function createMetricSuggestion(
  indexPattern: IndexPattern,
  layerId: string,
  state: FormBasedPrivateState,
  field: IndexPatternField
) {
  const [operation] = getMetricOperationTypes(field);

  if (!operation) {
    return;
  }

  return buildSuggestion({
    layerId,
    state,
    changeType: 'initial',
    updatedLayer: insertNewColumn({
      layer: {
        indexPatternId: indexPattern.id,
        columns: {},
        columnOrder: [],
      },
      columnId: generateId(),
      op: operation.type,
      field: operation.type === 'count' ? documentField : field,
      indexPattern,
      visualizationGroups: [],
    }),
  });
}

function getNestedTitle([outerBucketLabel, innerBucketLabel]: string[]) {
  return i18n.translate('xpack.lens.indexpattern.suggestions.nestingChangeLabel', {
    defaultMessage: '{innerOperation} for each {outerOperation}',
    values: {
      innerOperation: innerBucketLabel,
      outerOperation: outerBucketLabel,
    },
  });
}

// Replaces all metrics on the table with a different field-based function
function createAlternativeMetricSuggestions(
  indexPattern: IndexPattern,
  layerId: string,
  state: FormBasedPrivateState
) {
  const layer = state.layers[layerId];
  const suggestions: Array<DatasourceSuggestion<FormBasedPrivateState>> = [];
  const topLevelMetricColumns = layer.columnOrder.filter(
    (columnId) => !isReferenced(layer, columnId)
  );

  topLevelMetricColumns.forEach((columnId) => {
    const column = layer.columns[columnId];
    if (!hasField(column)) {
      return;
    }
    const field = indexPattern.getFieldByName(column.sourceField);
    if (!field) {
      return;
    }
    const possibleOperations = getMetricOperationTypes(field).filter(
      ({ type }) => type !== column.operationType
    );
    if (possibleOperations.length) {
      const layerWithNewMetric = replaceColumn({
        layer,
        indexPattern,
        field,
        columnId,
        op: possibleOperations[0].type,
        visualizationGroups: [],
      });
      if (layerWithNewMetric) {
        suggestions.push(
          buildSuggestion({
            state,
            layerId,
            updatedLayer: layerWithNewMetric,
            changeType: 'initial',
          })
        );
      }
    }
  });
  return suggestions;
}

function createSuggestionWithDefaultDateHistogram(
  state: FormBasedPrivateState,
  layerId: string,
  timeField: IndexPatternField,
  indexPatterns: IndexPatternMap
) {
  const layer = state.layers[layerId];
  const indexPattern = indexPatterns[layer.indexPatternId];

  return buildSuggestion({
    state,
    layerId,
    updatedLayer: insertNewColumn({
      layer,
      indexPattern,
      field: timeField,
      op: 'date_histogram',
      columnId: generateId(),
      visualizationGroups: [],
    }),
    label: i18n.translate('xpack.lens.indexpattern.suggestions.overTimeLabel', {
      defaultMessage: 'Over time',
    }),
    changeType: 'extended',
  });
}

function createSimplifiedTableSuggestions(state: FormBasedPrivateState, layerId: string) {
  const layer = state.layers[layerId];

  const [availableBucketedColumns, availableMetricColumns] = partition(
    layer.columnOrder,
    (colId) => layer.columns[colId].isBucketed
  );
  const topLevelMetricColumns = availableMetricColumns.filter(
    (columnId) => !isReferenced(layer, columnId)
  );

  return flatten(
    availableBucketedColumns.map((_col, index) => {
      // build suggestions with fewer buckets
      const bucketedColumns = availableBucketedColumns.slice(0, index + 1);
      const allMetricsSuggestion = {
        ...layer,
        columnOrder: [...bucketedColumns, ...availableMetricColumns],
        noBuckets: false,
      };

      if (bucketedColumns.length > 0 && topLevelMetricColumns.length > 1) {
        return [
          {
            ...layer,
            columnOrder: [
              ...bucketedColumns,
              topLevelMetricColumns[0],
              ...getReferencedColumnIds(layer, topLevelMetricColumns[0]),
            ],
            noBuckets: false,
          },
        ];
      } else if (availableBucketedColumns.length > 1) {
        return allMetricsSuggestion;
      }
      return [];
    })
  )
    .concat(
      // if there is just a single top level metric, the unchanged suggestion will take care of this case - only split up if there are multiple metrics or at least one bucket
      availableBucketedColumns.length > 0 || topLevelMetricColumns.length > 1
        ? topLevelMetricColumns.map((columnId) => {
            return {
              ...layer,
              columnOrder: [columnId, ...getReferencedColumnIds(layer, columnId)],
              noBuckets: true,
            };
          })
        : []
    )
    .map(({ noBuckets, ...updatedLayer }) => {
      return buildSuggestion({
        state,
        layerId,
        updatedLayer,
        changeType: 'reduced',
        label: noBuckets
          ? getMetricSuggestionTitle(updatedLayer, availableMetricColumns.length === 1)
          : undefined,
      });
    });
}

function getMetricSuggestionTitle(layer: FormBasedLayer, onlySimpleMetric: boolean) {
  const { operationType, label } = layer.columns[layer.columnOrder[0]];
  return i18n.translate('xpack.lens.indexpattern.suggestions.overallLabel', {
    defaultMessage: '{operation} overall',
    values: {
      operation: onlySimpleMetric ? operationDefinitionMap[operationType].displayName : label,
    },
    description:
      'Title of a suggested chart containing only a single numerical metric calculated over all available data',
  });
}
