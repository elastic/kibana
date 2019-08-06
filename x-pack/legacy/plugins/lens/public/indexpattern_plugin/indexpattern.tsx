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
  Operation,
  DatasourceLayerPanelProps,
} from '../types';
import { Query } from '../../../../../../src/legacy/core_plugins/data/public/query';
import { getIndexPatterns } from './loader';
import { toExpression } from './to_expression';
import { IndexPatternDimensionPanel } from './dimension_panel';
import { IndexPatternDatasourcePluginPlugins, DataPluginDependencies } from './plugin';
import { IndexPatternDataPanel } from './datapanel';
import {
  getDatasourceSuggestionsForField,
  getDatasourceSuggestionsFromCurrentState,
} from './indexpattern_suggestions';

import { isDraggedField } from './utils';
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

export interface DraggedField {
  field: IndexPatternField;
  indexPatternId: string;
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

export function getIndexPatternDatasource({
  chrome,
  toastNotifications,
  data,
  storage,
}: Omit<IndexPatternDatasourcePluginPlugins, 'data'> & { data: DataPluginDependencies }) {
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

    removeLayer(state: IndexPatternPrivateState, layerId: string) {
      const newLayers = { ...state.layers };
      delete newLayers[layerId];

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
          Object.values(state.layers)
            .map(layer => layer.indexPatternId)
            .map(indexPatternId => ({
              id: indexPatternId,
              title: state.indexPatterns[indexPatternId].title,
            }))
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
          const layer = state.layers[layerId];

          if (layer && layer.columns[columnId]) {
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
                dataPluginDependencies={data}
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
    getDatasourceSuggestionsForField(state, draggedField) {
      return isDraggedField(draggedField)
        ? getDatasourceSuggestionsForField(state, draggedField.indexPatternId, draggedField.field)
        : [];
    },
    getDatasourceSuggestionsFromCurrentState,
  };

  return indexPatternDatasource;
}
