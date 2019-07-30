/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { render } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { EuiText } from '@elastic/eui';
import {
  DatasourceDimensionPanelProps,
  DatasourceDataPanelProps,
  DimensionPriority,
  DatasourceSuggestion,
  Operation,
  DatasourceLayerPanelProps,
} from '../types';
import { Query } from '../../../../../../src/legacy/core_plugins/data/public/query';
import { getIndexPatterns } from './loader';
import { toExpression } from './to_expression';
import { IndexPatternDimensionPanel } from './dimension_panel';
import { getOperationTypesForField, buildColumn } from './operations';
import { IndexPatternDatasourcePluginPlugins } from './plugin';
import { IndexPatternDataPanel } from './datapanel';
import { generateId } from '../id_generator';
import { Datasource, DataType } from '..';

export type OperationType = IndexPatternColumn['operationType'];

export type IndexPatternColumn =
  | DateHistogramIndexPatternColumn
  | TermsIndexPatternColumn
  | SumIndexPatternColumn
  | AvgIndexPatternColumn
  | MinIndexPatternColumn
  | MaxIndexPatternColumn
  | CountIndexPatternColumn
  | FilterRatioIndexPatternColumn;

export interface BaseIndexPatternColumn {
  label: string;
  dataType: DataType;
  isBucketed: boolean;

  // Private
  operationType: OperationType;
  suggestedPriority?: DimensionPriority;
  indexPatternId: string;
}

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
type ParameterlessIndexPatternColumn<
  TOperationType extends OperationType,
  TBase extends BaseIndexPatternColumn = FieldBasedIndexPatternColumn
> = Omit<TBase, 'operationType'> & { operationType: TOperationType };

export interface FieldBasedIndexPatternColumn extends BaseIndexPatternColumn {
  sourceField: string;
  suggestedPriority?: DimensionPriority;
}

export interface DateHistogramIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'date_histogram';
  params: {
    interval: string;
    timeZone?: string;
  };
}

export interface TermsIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'terms';
  params: {
    size: number;
    orderBy: { type: 'alphabetical' } | { type: 'column'; columnId: string };
    orderDirection: 'asc' | 'desc';
  };
}

export interface FilterRatioIndexPatternColumn extends BaseIndexPatternColumn {
  operationType: 'filter_ratio';
  params: {
    numerator: Query;
    denominator: Query;
  };
}

export type CountIndexPatternColumn = ParameterlessIndexPatternColumn<
  'count',
  BaseIndexPatternColumn
>;
export type SumIndexPatternColumn = ParameterlessIndexPatternColumn<'sum'>;
export type AvgIndexPatternColumn = ParameterlessIndexPatternColumn<'avg'>;
export type MinIndexPatternColumn = ParameterlessIndexPatternColumn<'min'>;
export type MaxIndexPatternColumn = ParameterlessIndexPatternColumn<'max'>;

export interface IndexPattern {
  id: string;
  fields: IndexPatternField[];
  title: string;
  timeFieldName?: string | null;
}

export interface IndexPatternField {
  name: string;
  type: string;
  esTypes?: string[];
  aggregatable: boolean;
  searchable: boolean;
  aggregationRestrictions?: Partial<
    Record<
      string,
      {
        agg: string;
        interval?: number;
        fixed_interval?: string;
        calendar_interval?: string;
        delay?: string;
        time_zone?: string;
      }
    >
  >;
}

export interface IndexPatternLayer {
  columnOrder: string[];
  columns: Record<string, IndexPatternColumn>;
  // Each layer is tied to the index pattern that created it
  indexPatternId: string;
}
export interface IndexPatternPersistedState {
  currentIndexPatternId: string;
  layers: Record<string, IndexPatternLayer>;
}

export type IndexPatternPrivateState = IndexPatternPersistedState & {
  indexPatterns: Record<string, IndexPattern>;
};

export function columnToOperation(column: IndexPatternColumn): Operation {
  const { dataType, label, isBucketed } = column;
  return {
    label,
    dataType,
    isBucketed,
  };
}

type UnwrapPromise<T> = T extends Promise<infer P> ? P : T;
type InferFromArray<T> = T extends Array<infer P> ? P : T;

function addRestrictionsToFields(
  indexPattern: InferFromArray<Exclude<UnwrapPromise<ReturnType<typeof getIndexPatterns>>, void>>
): IndexPattern {
  const { typeMeta } = indexPattern;
  if (!typeMeta) {
    return indexPattern;
  }

  const aggs = Object.keys(typeMeta.aggs);

  const newFields = [...(indexPattern.fields as IndexPatternField[])];
  newFields.forEach((field, index) => {
    const restrictionsObj: IndexPatternField['aggregationRestrictions'] = {};
    aggs.forEach(agg => {
      if (typeMeta.aggs[agg] && typeMeta.aggs[agg][field.name]) {
        restrictionsObj[agg] = typeMeta.aggs[agg][field.name];
      }
    });
    if (Object.keys(restrictionsObj).length) {
      newFields[index] = { ...field, aggregationRestrictions: restrictionsObj };
    }
  });

  const { id, title, timeFieldName } = indexPattern;

  return {
    id,
    title,
    timeFieldName: timeFieldName || undefined,
    fields: newFields,
  };
}

function removeProperty<T>(prop: string, object: Record<string, T>): Record<string, T> {
  const result = { ...object };
  delete result[prop];
  return result;
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

export function getIndexPatternDatasource({
  chrome,
  toastNotifications,
  data,
  storage,
}: IndexPatternDatasourcePluginPlugins) {
  // Not stateful. State is persisted to the frame
  const indexPatternDatasource: Datasource<IndexPatternPrivateState, IndexPatternPersistedState> = {
    async initialize(state?: IndexPatternPersistedState) {
      const indexPatternObjects = await getIndexPatterns(chrome, toastNotifications);
      const indexPatterns: Record<string, IndexPattern> = {};

      if (indexPatternObjects) {
        indexPatternObjects.forEach(obj => {
          indexPatterns[obj.id] = addRestrictionsToFields(obj);
        });
      }

      if (state) {
        return {
          ...state,
          indexPatterns,
        };
      }
      return {
        currentIndexPatternId: indexPatternObjects ? indexPatternObjects[0].id : '',
        indexPatterns,
        layers: {},
      };
    },

    getPersistableState({ currentIndexPatternId, layers }: IndexPatternPrivateState) {
      return { currentIndexPatternId, layers };
    },

    insertLayer(state: IndexPatternPrivateState, newLayerId: string) {
      return {
        ...state,
        layers: {
          ...state.layers,
          [newLayerId]: {
            indexPatternId: state.currentIndexPatternId,
            columns: {},
            columnOrder: [],
          },
        },
      };
    },

    removeLayers(state: IndexPatternPrivateState, layerIds: string[]) {
      const newLayers = { ...state.layers };
      layerIds.forEach(layerId => {
        delete newLayers[layerId];
      });

      return {
        ...state,
        layers: newLayers,
      };
    },

    getLayers(state: IndexPatternPrivateState) {
      return Object.keys(state.layers);
    },

    toExpression,

    getMetaData(state: IndexPatternPrivateState) {
      return {
        filterableIndexPatterns: _.uniq(
          Object.values(state.layers).map(layer => layer.indexPatternId)
        ),
      };
    },

    renderDataPanel(
      domElement: Element,
      props: DatasourceDataPanelProps<IndexPatternPrivateState>
    ) {
      render(
        <I18nProvider>
          <IndexPatternDataPanel {...props} />
        </I18nProvider>,
        domElement
      );
    },

    getPublicAPI(state, setState, layerId) {
      return {
        getTableSpec: () => {
          return state.layers[layerId].columnOrder.map(colId => ({ columnId: colId }));
        },
        getOperationForColumnId: (columnId: string) => {
          const layer = Object.values(state.layers).find(l =>
            l.columnOrder.find(id => id === columnId)
          );

          if (layer) {
            return columnToOperation(layer.columns[columnId]);
          }
          return null;
        },
        renderDimensionPanel: (domElement: Element, props: DatasourceDimensionPanelProps) => {
          render(
            <I18nProvider>
              <IndexPatternDimensionPanel
                state={state}
                setState={newState => setState(newState)}
                dataPlugin={data}
                storage={storage}
                layerId={props.layerId}
                {...props}
              />
            </I18nProvider>,
            domElement
          );
        },

        renderLayerPanel: (domElement: Element, props: DatasourceLayerPanelProps) => {
          render(
            <I18nProvider>
              <EuiText size="s">
                {state.indexPatterns[state.layers[props.layerId].indexPatternId].title}
              </EuiText>
            </I18nProvider>,
            domElement
          );
        },

        removeColumnInTableSpec: (columnId: string) => {
          setState({
            ...state,
            layers: {
              ...state.layers,
              [layerId]: {
                ...state.layers[layerId],
                columnOrder: state.layers[layerId].columnOrder.filter(id => id !== columnId),
                columns: removeProperty(columnId, state.layers[layerId].columns),
              },
            },
          });
        },
        moveColumnTo: () => {},
        duplicateColumn: () => [],
      };
    },

    getDatasourceSuggestionsForField(
      state,
      item
    ): Array<DatasourceSuggestion<IndexPatternPrivateState>> {
      const layers = Object.keys(state.layers);
      const field: IndexPatternField = item as IndexPatternField;

      const currentIndexPattern = state.indexPatterns[state.currentIndexPatternId];

      const indexPatternId = getIndexPatternIdFromField(state, field);

      let layerId;
      let layer: IndexPatternLayer;

      if (indexPatternId) {
        layerId = layers.find(id => state.layers[id].indexPatternId === indexPatternId);
      }

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
        if (layer.columnOrder.length) {
          // We aren't suggesting ways of using the field to replace the existing user configuration
          // This is a good place for future extension
          return [];
        }
      }

      const operations = getOperationTypesForField(field);
      const hasBucket = operations.find(op => op === 'date_histogram' || op === 'terms');

      if (hasBucket) {
        const countColumn = buildColumn({
          op: 'count',
          columns: layer.columns,
          indexPattern: currentIndexPattern,
          layerId,
          suggestedPriority: undefined,
        });

        // let column know about count column
        const column = buildColumn({
          layerId,
          op: hasBucket,
          indexPattern: currentIndexPattern,
          columns: {
            col2: countColumn,
          },
          field,
          suggestedPriority: undefined,
        });

        const suggestion: DatasourceSuggestion<IndexPatternPrivateState> = {
          state: {
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

          table: {
            columns: [
              {
                columnId: 'col1',
                operation: columnToOperation(column),
              },
              {
                columnId: 'col2',
                operation: columnToOperation(countColumn),
              },
            ],
            isMultiRow: true,
            datasourceSuggestionId: 0,
            layerId,
          },
        };

        return [suggestion];
      } else if (state.indexPatterns[state.currentIndexPatternId].timeFieldName) {
        const dateField = currentIndexPattern.fields.find(
          f => f.name === currentIndexPattern.timeFieldName
        )!;

        const column = buildColumn({
          op: operations[0],
          columns: layer.columns,
          suggestedPriority: undefined,
          field,
          indexPattern: currentIndexPattern,
          layerId,
        });

        const dateColumn = buildColumn({
          op: 'date_histogram',
          columns: layer.columns,
          suggestedPriority: undefined,
          field: dateField,
          indexPattern: currentIndexPattern,
          layerId,
        });

        const suggestion: DatasourceSuggestion<IndexPatternPrivateState> = {
          state: {
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

          table: {
            columns: [
              {
                columnId: 'col1',
                operation: columnToOperation(column),
              },
              {
                columnId: 'col2',
                operation: columnToOperation(dateColumn),
              },
            ],
            isMultiRow: true,
            datasourceSuggestionId: 0,
            layerId,
          },
        };

        return [suggestion];
      }

      return [];
    },

    getDatasourceSuggestionsFromCurrentState(
      state
    ): Array<DatasourceSuggestion<IndexPatternPrivateState>> {
      const layers = Object.entries(state.layers);

      return layers
        .map(([layerId, layer], index) => {
          if (layer.columnOrder.length === 0) {
            return;
          }
          return {
            state,

            table: {
              columns: layer.columnOrder.map(id => ({
                columnId: id,
                operation: columnToOperation(layer.columns[id]),
              })),
              isMultiRow: true,
              datasourceSuggestionId: index,
              layerId,
            },
          };
        })
        .reduce((prev, current) => (current ? prev.concat([current]) : prev), [] as Array<
          DatasourceSuggestion<IndexPatternPrivateState>
        >);
    },
  };

  return indexPatternDatasource;
}
