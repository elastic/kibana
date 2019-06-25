/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useReducer, useMemo } from 'react';
import { ExpressionRenderer } from '../../../../../../../src/legacy/core_plugins/data/public';
import { Datasource, Visualization } from '../../types';
import { reducer, getInitialState } from './state_management';
import { DataPanelWrapper } from './data_panel_wrapper';
import { ConfigPanelWrapper } from './config_panel_wrapper';
import { FrameLayout } from './frame_layout';
import { SuggestionPanel } from './suggestion_panel';
import { WorkspacePanel } from './workspace_panel';

export interface EditorFrameProps {
  datasourceMap: Record<string, Datasource>;
  visualizationMap: Record<string, Visualization>;

  initialDatasourceId: string | null;
  initialVisualizationId: string | null;

  ExpressionRenderer: ExpressionRenderer;
}

export function EditorFrame(props: EditorFrameProps) {
  const [state, dispatch] = useReducer(reducer, props, getInitialState);

  // create public datasource api for current state
  // as soon as datasource is available and memoize it
  const datasourcePublicAPI = useMemo(
    () =>
      state.datasource.activeId && !state.datasource.isLoading
        ? props.datasourceMap[state.datasource.activeId].getPublicAPI(
            state.datasource.state,
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
      state.datasource.isLoading,
      state.datasource.activeId,
      state.datasource.state,
    ]
  );

  // Initialize current datasource
  useEffect(
    () => {
      let datasourceGotSwitched = false;
      if (state.datasource.isLoading && state.datasource.activeId) {
        props.datasourceMap[state.datasource.activeId].initialize().then(datasourceState => {
          if (!datasourceGotSwitched) {
            dispatch({
              type: 'UPDATE_DATASOURCE_STATE',
              newState: datasourceState,
            });
          }
        });

        return () => {
          datasourceGotSwitched = true;
        };
      }
    },
    [state.datasource.activeId, state.datasource.isLoading]
  );

  // Initialize visualization as soon as datasource is ready
  useEffect(
    () => {
      if (
        datasourcePublicAPI &&
        state.visualization.state === null &&
        state.visualization.activeId !== null
      ) {
        const initialVisualizationState = props.visualizationMap[
          state.visualization.activeId
        ].initialize(datasourcePublicAPI);
        dispatch({
          type: 'UPDATE_VISUALIZATION_STATE',
          newState: initialVisualizationState,
        });
      }
    },
    [datasourcePublicAPI, state.visualization.activeId, state.visualization.state]
  );

  if (state.datasource.activeId && !state.datasource.isLoading) {
    return (
      <FrameLayout
        dataPanel={
          <DataPanelWrapper
            datasourceMap={props.datasourceMap}
            activeDatasource={state.datasource.activeId}
            datasourceState={state.datasource.state}
            datasourceIsLoading={state.datasource.isLoading}
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
          />
        }
        workspacePanel={
          <WorkspacePanel
            activeDatasource={props.datasourceMap[state.datasource.activeId]}
            activeVisualizationId={state.visualization.activeId}
            datasourcePublicAPI={datasourcePublicAPI!}
            datasourceState={state.datasource.state}
            visualizationState={state.visualization.state}
            visualizationMap={props.visualizationMap}
            dispatch={dispatch}
            ExpressionRenderer={props.ExpressionRenderer}
          />
        }
        suggestionsPanel={
          <SuggestionPanel
            activeDatasource={props.datasourceMap[state.datasource.activeId]}
            activeVisualizationId={state.visualization.activeId}
            datasourceState={state.datasource.state}
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
          activeDatasource={state.datasource.activeId}
          datasourceIsLoading={state.datasource.isLoading}
          datasourceState={state.datasource.state}
          datasourceMap={props.datasourceMap}
          dispatch={dispatch}
        />
      }
    />
  );
}
