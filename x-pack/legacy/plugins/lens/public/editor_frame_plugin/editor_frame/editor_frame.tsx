/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useReducer } from 'react';
import {
  ExpressionRenderer,
  Query,
} from '../../../../../../../src/legacy/core_plugins/data/public';
import { Datasource, DatasourcePublicAPI, FramePublicAPI, Visualization } from '../../types';
import { reducer, getInitialState } from './state_management';
import { DataPanelWrapper } from './data_panel_wrapper';
import { ConfigPanelWrapper } from './config_panel_wrapper';
import { FrameLayout } from './frame_layout';
import { SuggestionPanel } from './suggestion_panel';
import { WorkspacePanel } from './workspace_panel';
import { Document } from '../../persistence/saved_object_store';
import { getSavedObjectFormat } from './save';
import { WorkspacePanelWrapper } from './workspace_panel_wrapper';
import { generateId } from '../../id_generator';

export interface EditorFrameProps {
  doc?: Document;
  datasourceMap: Record<string, Datasource>;
  visualizationMap: Record<string, Visualization>;
  initialDatasourceId: string | null;
  initialVisualizationId: string | null;
  ExpressionRenderer: ExpressionRenderer;
  onError: (e: { message: string }) => void;

  dateRange: {
    fromDate: string;
    toDate: string;
  };
  query: Query;
  onIndexPatternChange: (indexPatterns: string[]) => void;
  onStateChange: (newDoc: Document) => void;
}

export function EditorFrame(props: EditorFrameProps) {
  const [state, dispatch] = useReducer(reducer, props, getInitialState);
  const { onError } = props;

  const allLoaded = Object.values(state.datasourceStates).every(
    ({ isLoading }) => typeof isLoading === 'boolean' && !isLoading
  );

  // Initialize current datasource and all active datasources
  useEffect(() => {
    if (!allLoaded) {
      Object.entries(props.datasourceMap).forEach(([datasourceId, datasource]) => {
        if (
          state.datasourceStates[datasourceId] &&
          state.datasourceStates[datasourceId].isLoading
        ) {
          datasource
            .initialize(state.datasourceStates[datasourceId].state || undefined)
            .then(datasourceState => {
              dispatch({
                type: 'UPDATE_DATASOURCE_STATE',
                newState: datasourceState,
                datasourceId,
              });
            })
            .catch(onError);
        }
      });
    }
  }, [allLoaded]);

  const datasourceLayers: Record<string, DatasourcePublicAPI> = {};
  Object.keys(props.datasourceMap)
    .filter(id => state.datasourceStates[id] && !state.datasourceStates[id].isLoading)
    .forEach(id => {
      const datasourceState = state.datasourceStates[id].state;
      const datasource = props.datasourceMap[id];

      const layers = datasource.getLayers(datasourceState);
      layers.forEach(layer => {
        const publicAPI = props.datasourceMap[id].getPublicAPI(
          datasourceState,
          (newState: unknown) => {
            dispatch({
              type: 'UPDATE_DATASOURCE_STATE',
              datasourceId: id,
              newState,
            });
          },
          layer
        );

        datasourceLayers[layer] = publicAPI;
      });
    });

  const framePublicAPI: FramePublicAPI = {
    datasourceLayers,
    dateRange: props.dateRange,
    query: props.query,

    addNewLayer: () => {
      const newLayerId = generateId();

      const newState = props.datasourceMap[state.activeDatasourceId!].insertLayer(
        state.datasourceStates[state.activeDatasourceId!].state,
        newLayerId
      );

      dispatch({
        type: 'UPDATE_DATASOURCE_STATE',
        datasourceId: state.activeDatasourceId!,
        newState,
      });

      return newLayerId;
    },
    removeLayer: (layerId: string) => {
      const newState = props.datasourceMap[state.activeDatasourceId!].removeLayer(
        state.datasourceStates[state.activeDatasourceId!].state,
        layerId
      );

      dispatch({
        type: 'UPDATE_DATASOURCE_STATE',
        datasourceId: state.activeDatasourceId!,
        newState,
      });
    },
  };

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

  // Initialize visualization as soon as all datasources are ready
  useEffect(() => {
    if (allLoaded && state.visualization.state === null && state.visualization.activeId !== null) {
      const initialVisualizationState = props.visualizationMap[
        state.visualization.activeId
      ].initialize(framePublicAPI);
      dispatch({
        type: 'UPDATE_VISUALIZATION_STATE',
        newState: initialVisualizationState,
      });
    }
  }, [allLoaded, state.visualization.activeId, state.visualization.state]);

  // There are two callbacks that the frame needs to call every time its internal state changes
  useEffect(() => {
    const filterableIndexPatterns: string[] = [];
    Object.entries(props.datasourceMap)
      .filter(([id, datasource]) => {
        const stateWrapper = state.datasourceStates[id];
        return (
          stateWrapper &&
          !stateWrapper.isLoading &&
          datasource.getLayers(stateWrapper.state).length > 0
        );
      })
      .forEach(([id, datasource]) => {
        filterableIndexPatterns.push(
          ...datasource.getMetaData(state.datasourceStates[id].state).filterableIndexPatterns
        );
      });

    props.onIndexPatternChange(filterableIndexPatterns);

    const activeDatasource =
      state.activeDatasourceId && !state.datasourceStates[state.activeDatasourceId].isLoading
        ? props.datasourceMap[state.activeDatasourceId]
        : undefined;

    const visualization = state.visualization.activeId
      ? props.visualizationMap[state.visualization.activeId]
      : undefined;

    if (!activeDatasource || !visualization) {
      return;
    }

    getSavedObjectFormat({
      activeDatasources: Object.keys(state.datasourceStates).reduce(
        (datasourceMap, datasourceId) => ({
          ...datasourceMap,
          [datasourceId]: props.datasourceMap[datasourceId],
        }),
        {}
      ),
      visualization,
      state,
      activeDatasourceId: state.activeDatasourceId!,
      framePublicAPI,
    }).then(doc => {
      props.onStateChange(doc);
    });
  }, [state.datasourceStates, state.visualization, props.query, props.dateRange, state.title]);

  return (
    <FrameLayout
      dataPanel={
        <DataPanelWrapper
          datasourceMap={props.datasourceMap}
          activeDatasource={state.activeDatasourceId}
          datasourceState={
            state.activeDatasourceId ? state.datasourceStates[state.activeDatasourceId].state : null
          }
          datasourceIsLoading={
            state.activeDatasourceId
              ? state.datasourceStates[state.activeDatasourceId].isLoading
              : true
          }
          dispatch={dispatch}
        />
      }
      configPanel={
        allLoaded && (
          <ConfigPanelWrapper
            visualizationMap={props.visualizationMap}
            activeVisualizationId={state.visualization.activeId}
            dispatch={dispatch}
            visualizationState={state.visualization.state}
            framePublicAPI={framePublicAPI}
          />
        )
      }
      workspacePanel={
        allLoaded && (
          <WorkspacePanelWrapper title={state.title} dispatch={dispatch}>
            <WorkspacePanel
              activeDatasourceId={state.activeDatasourceId}
              activeVisualizationId={state.visualization.activeId}
              datasourceMap={props.datasourceMap}
              datasourceStates={state.datasourceStates}
              framePublicAPI={framePublicAPI}
              visualizationState={state.visualization.state}
              visualizationMap={props.visualizationMap}
              dispatch={dispatch}
              ExpressionRenderer={props.ExpressionRenderer}
            />
          </WorkspacePanelWrapper>
        )
      }
      suggestionsPanel={
        allLoaded && (
          <SuggestionPanel
            activeDatasourceId={state.activeDatasourceId}
            activeVisualizationId={state.visualization.activeId}
            datasourceMap={props.datasourceMap}
            datasourceStates={state.datasourceStates}
            visualizationState={state.visualization.state}
            visualizationMap={props.visualizationMap}
            dispatch={dispatch}
            ExpressionRenderer={props.ExpressionRenderer}
          />
        )
      }
    />
  );
}
