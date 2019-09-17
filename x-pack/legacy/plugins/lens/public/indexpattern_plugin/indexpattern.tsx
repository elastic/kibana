/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { render } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { CoreSetup, SavedObjectsClientContract } from 'src/core/public';
import { Storage } from 'ui/storage';
import { EuiLoadingSpinner } from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';
import {
  DatasourceDimensionPanelProps,
  Operation,
  DatasourceLayerPanelProps,
  Datasource,
  IndexPatternListItem,
  DatasourceDataPanelProps,
  DatasourcePublicAPIProps,
} from '../types';
import { toExpression } from './to_expression';
import { IndexPatternDimensionPanel } from './dimension_panel';
import { IndexPatternDatasourcePluginPlugins } from './plugin';
import {
  getDatasourceSuggestionsForField,
  getDatasourceSuggestionsFromCurrentState,
} from './indexpattern_suggestions';

import { isDraggedField } from './utils';
import { LayerPanel } from './layerpanel';
import { IndexPatternColumn } from './operations';
import { IndexPatternField, IndexPattern } from '../../common';
import { IndexPatternDataPanel } from './datapanel';
import { createActionsFactory } from './state_helpers';

export { OperationType, IndexPatternColumn } from './operations';

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
  indexPatterns: Record<string, IndexPatternListItem>;
  showEmptyFields: boolean;
  indexPatternMap: Record<string, IndexPattern | undefined>;
};

export function columnToOperation(column: IndexPatternColumn): Operation {
  const { dataType, label, isBucketed, scale } = column;
  return {
    label,
    dataType,
    isBucketed,
    scale,
  };
}

function removeProperty<T>(prop: string, object: Record<string, T>): Record<string, T> {
  const result = { ...object };
  delete result[prop];
  return result;
}

export function getIndexPatternDatasource({
  core,
  chrome,
  storage,
  savedObjectsClient,
}: IndexPatternDatasourcePluginPlugins & {
  core: CoreSetup;
  storage: Storage;
  savedObjectsClient: SavedObjectsClientContract;
}) {
  const uiSettings = chrome.getUiSettingsClient();
  const actionsFactory = createActionsFactory({
    onError(err) {
      toastNotifications.addError(err, {
        title: i18n.translate('xpack.lens.indexPattern', { defaultMessage: 'Lens Index Pattern' }),
      });
    },
  });

  // Not stateful. State is persisted to the frame
  const indexPatternDatasource: Datasource<IndexPatternPrivateState, IndexPatternPersistedState> = {
    initialize(state?: IndexPatternPersistedState) {
      return actionsFactory.getInitialState(savedObjectsClient, state);
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
        filterableIndexPatterns: Object.values(state.indexPatterns) as IndexPatternListItem[],
      };
    },

    renderDataPanel(
      domElement: Element,
      props: DatasourceDataPanelProps<IndexPatternPrivateState>
    ) {
      render(
        <I18nProvider>
          <IndexPatternDataPanel actions={actionsFactory.withContext(props)} {...props} />
        </I18nProvider>,
        domElement
      );
    },

    getPublicAPI(opts: DatasourcePublicAPIProps<IndexPatternPrivateState>) {
      const { layerId, state, setState } = opts;
      const actions = actionsFactory.withContext(opts);

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
          const indexPattern = state.indexPatternMap[state.layers[layerId].indexPatternId];

          if (indexPattern) {
            render(
              <I18nProvider>
                <IndexPatternDimensionPanel
                  state={state}
                  setState={setState}
                  uiSettings={uiSettings}
                  storage={storage}
                  savedObjectsClient={savedObjectsClient}
                  layerId={props.layerId}
                  indexPattern={indexPattern!}
                  {...props}
                />
              </I18nProvider>,
              domElement
            );
          } else {
            render(<EuiLoadingSpinner size="m" />, domElement);
          }
        },

        renderLayerPanel: (domElement: Element, props: DatasourceLayerPanelProps) => {
          render(
            <LayerPanel
              state={state}
              layerId={props.layerId}
              setLayerIndexPattern={actions.setLayerIndexPattern}
            />,
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
