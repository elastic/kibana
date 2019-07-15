/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useReducer, useMemo } from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ExpressionRenderer } from '../../../../../../../src/legacy/core_plugins/data/public';
import { Datasource, FramePublicAPI, Visualization } from '../../types';
import { reducer, getInitialState } from './state_management';
import { DataPanelWrapper } from './data_panel_wrapper';
import { ConfigPanelWrapper } from './config_panel_wrapper';
import { FrameLayout } from './frame_layout';
import { SuggestionPanel } from './suggestion_panel';
import { WorkspacePanel } from './workspace_panel';
import { SavedObjectStore, Document } from '../../persistence/saved_object_store';
import { save } from './save';
import { WorkspacePanelWrapper } from './workspace_panel_wrapper';

export interface EditorFrameProps {
  doc?: Document;
  store: SavedObjectStore;
  datasourceMap: Record<string, Datasource>;
  visualizationMap: Record<string, Visualization>;
  layerToDatasourceId: Record<string, string>;
  redirectTo: (path: string) => void;
  initialDatasourceId: string | null;
  initialVisualizationId: string | null;
  ExpressionRenderer: ExpressionRenderer;
  onError: (e: { message: string }) => void;
}

export function EditorFrame(props: EditorFrameProps) {
  const [state, dispatch] = useReducer(reducer, props, getInitialState);
  const { onError } = props;

  // create public datasource api for current state
  // as soon as datasource is available and memoize it
  const datasourcePublicAPI = useMemo(
    () =>
      state.activeDatasourceId && !state.datasources[state.activeDatasourceId].isLoading
        ? props.datasourceMap[state.activeDatasourceId].getPublicAPI(
            state.datasources[state.activeDatasourceId].state,
            (newState: unknown) => {
              dispatch({
                type: 'UPDATE_DATASOURCE_STATE',
                newState,
              });
            }
          )
        : undefined,
    [
      props.datasourceMap,
      state.activeDatasourceId,
      state.datasources[state.activeDatasourceId!],
      // state.datasource.isLoading,
      // state.activeDatasourceId,
      // state.datasource.state,
    ]
  );

  const framePublicAPI: FramePublicAPI = {
    layerIdToDatasource: state.layerToDatasourceId,
    datasourceLayers: {},
    addNewLayer: () => {
      const newLayerId = 'second';

      dispatch({
        type: 'CREATE_LAYER',
        newLayerId,
      });

      return newLayerId;
    },
  };

  // const layerToDatasource = {
  //   0: datasourcePublicAPI,
  // };

  useEffect(() => {
    if (props.doc) {
      dispatch({
        type: 'VISUALIZATION_LOADED',
        doc: props.doc,
      });
    } else {
      dispatch({
        type: 'RESET',
        state: getInitialState(props),
      });
    }
  }, [props.doc]);

  // Initialize current datasource
  useEffect(() => {
    let datasourceGotSwitched = false;
    // if (state.datasource.isLoading && state.activeDatasourceId) {
    if (state.activeDatasourceId && state.datasources[state.activeDatasourceId].isLoading) {
      props.datasourceMap[state.activeDatasourceId]
        .initialize(props.doc && props.doc.state.datasource)
        .then(datasourceState => {
          if (!datasourceGotSwitched) {
            dispatch({
              type: 'UPDATE_DATASOURCE_STATE',
              newState: datasourceState,
            });
          }
        })
        .catch(onError);

      return () => {
        datasourceGotSwitched = true;
      };
    }
  }, [props.doc, state.activeDatasourceId, state.datasources[state.activeDatasourceId!].isLoading]);

  // Initialize visualization as soon as datasource is ready
  useEffect(() => {
    if (
      datasourcePublicAPI &&
      state.visualization.state === null &&
      state.visualization.activeId !== null
    ) {
      const initialVisualizationState = props.visualizationMap[
        state.visualization.activeId
      ].initialize(framePublicAPI, datasourcePublicAPI);
      dispatch({
        type: 'UPDATE_VISUALIZATION_STATE',
        newState: initialVisualizationState,
      });
    }
  }, [datasourcePublicAPI, state.visualization.activeId, state.visualization.state]);

  const datasource =
    state.activeDatasourceId && !state.datasources[state.activeDatasourceId].isLoading
      ? props.datasourceMap[state.activeDatasourceId]
      : undefined;

  const visualization = state.visualization.activeId
    ? props.visualizationMap[state.visualization.activeId]
    : undefined;

  if (datasource) {
    return (
      <FrameLayout
        navPanel={
          <nav>
            <EuiLink
              onClick={() => {
                if (datasource && visualization) {
                  save({
                    datasource,
                    dispatch,
                    visualization,
                    state,
                    redirectTo: props.redirectTo,
                    store: props.store,
                  }).catch(onError);
                }
              }}
              disabled={state.saving || !state.activeDatasourceId || !state.visualization.activeId}
            >
              {i18n.translate('xpack.lens.editorFrame.Save', {
                defaultMessage: 'Save',
              })}
            </EuiLink>
          </nav>
        }
        dataPanel={
          <DataPanelWrapper
            datasourceMap={props.datasourceMap}
            activeDatasource={state.activeDatasourceId}
            datasourceState={
              state.activeDatasourceId ? state.datasources[state.activeDatasourceId].state : null
            }
            datasourceIsLoading={
              state.activeDatasourceId
                ? state.datasources[state.activeDatasourceId].isLoading
                : true
            }
            dispatch={dispatch}
          />
        }
        configPanel={
          <ConfigPanelWrapper
            visualizationMap={props.visualizationMap}
            activeVisualizationId={state.visualization.activeId}
            datasourcePublicAPI={datasourcePublicAPI!}
            dispatch={dispatch}
            visualizationState={state.visualization.state}
            framePublicAPI={framePublicAPI}
          />
        }
        workspacePanel={
          <WorkspacePanelWrapper title={state.title} dispatch={dispatch}>
            <WorkspacePanel
              activeDatasource={datasource}
              activeVisualizationId={state.visualization.activeId}
              datasourcePublicAPI={datasourcePublicAPI!}
              datasourceState={
                state.activeDatasourceId ? state.datasources[state.activeDatasourceId].state : null
              }
              visualizationState={state.visualization.state}
              visualizationMap={props.visualizationMap}
              dispatch={dispatch}
              ExpressionRenderer={props.ExpressionRenderer}
            />
          </WorkspacePanelWrapper>
        }
        suggestionsPanel={
          <SuggestionPanel
            activeDatasource={datasource}
            activeVisualizationId={state.visualization.activeId}
            datasourceState={
              state.activeDatasourceId ? state.datasources[state.activeDatasourceId].state : null
            }
            visualizationState={state.visualization.state}
            visualizationMap={props.visualizationMap}
            dispatch={dispatch}
            ExpressionRenderer={props.ExpressionRenderer}
          />
        }
      />
    );
  }

  return (
    <FrameLayout
      dataPanel={
        <DataPanelWrapper
          activeDatasource={state.activeDatasourceId}
          datasourceIsLoading={
            state.activeDatasourceId ? state.datasources[state.activeDatasourceId].isLoading : true
          }
          datasourceState={
            state.activeDatasourceId ? state.datasources[state.activeDatasourceId].state : null
          }
          datasourceMap={props.datasourceMap}
          dispatch={dispatch}
        />
      }
    />
  );
}
