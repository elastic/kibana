/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { render } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { Storage } from 'ui/storage';
import {
  DatasourceDimensionPanelProps,
  DatasourceDataPanelProps,
  Operation,
  DatasourceLayerPanelProps,
} from '../types';
import { getIndexPatterns } from './loader';
import { toExpression } from './to_expression';
import { IndexPatternDimensionPanel } from './dimension_panel';
import { IndexPatternDatasourcePluginPlugins } from './plugin';
import { IndexPatternDataPanel } from './datapanel';
import {
  getDatasourceSuggestionsForField,
  getDatasourceSuggestionsFromCurrentState,
} from './indexpattern_suggestions';

import { isDraggedField } from './utils';
import { LayerPanel } from './layerpanel';
import { IndexPatternColumn } from './operations';
import { Datasource } from '..';

export { OperationType, IndexPatternColumn } from './operations';

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
  const { dataType, label, isBucketed, isMetric, scale } = column;
  return {
    label,
    dataType,
    isBucketed,
    scale,
    isMetric,
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
  storage,
}: IndexPatternDatasourcePluginPlugins & { storage: Storage }) {
  const uiSettings = chrome.getUiSettingsClient();
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
                setState={setState}
                uiSettings={uiSettings}
                storage={storage}
                layerId={props.layerId}
                {...props}
              />
            </I18nProvider>,
            domElement
          );
        },

        renderLayerPanel: (domElement: Element, props: DatasourceLayerPanelProps) => {
          render(<LayerPanel state={state} setState={setState} {...props} />, domElement);
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
