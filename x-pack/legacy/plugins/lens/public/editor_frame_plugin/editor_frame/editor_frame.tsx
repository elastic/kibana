/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useReducer, useMemo } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ExpressionRenderer } from '../../../../../../../src/legacy/core_plugins/data/public';
import { Datasource, Visualization } from '../../types';
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

  useEffect(
    () => {
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
    },
    [props.doc]
  );

  // Initialize current datasource
  useEffect(
    () => {
      let datasourceGotSwitched = false;
      if (state.datasource.isLoading && state.datasource.activeId) {
        props.datasourceMap[state.datasource.activeId]
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
    },
    [props.doc, state.datasource.activeId, state.datasource.isLoading]
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

  const datasource =
    state.datasource.activeId && !state.datasource.isLoading
      ? props.datasourceMap[state.datasource.activeId]
      : undefined;

  const visualization = state.visualization.activeId
    ? props.visualizationMap[state.visualization.activeId]
    : undefined;

  if (datasource) {
    return (
      <FrameLayout
        navPanel={
          <nav>
            <EuiButton
              fill
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
              disabled={state.saving || !state.datasource.activeId || !state.visualization.activeId}
            >
              {i18n.translate('xpack.lens.editorFrame.Save', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </nav>
        }
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
          <WorkspacePanelWrapper title={state.title} dispatch={dispatch}>
            <WorkspacePanel
              activeDatasource={datasource}
              activeVisualizationId={state.visualization.activeId}
              datasourcePublicAPI={datasourcePublicAPI!}
              datasourceState={state.datasource.state}
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
            datasourcePublicAPI={datasourcePublicAPI!}
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
