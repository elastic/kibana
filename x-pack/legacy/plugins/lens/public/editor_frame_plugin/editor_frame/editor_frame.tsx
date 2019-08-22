/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EditorFrameProps } from '../../types';
import { DataPanelWrapper } from './data_panel_wrapper';
import { ConfigPanelWrapper } from './config_panel_wrapper';
import { FrameLayout } from './frame_layout';
import { SuggestionPanel } from './suggestion_panel';
import { WorkspacePanel } from './workspace_panel';
import { WorkspacePanelWrapper } from './workspace_panel_wrapper';

export function EditorFrame(props: EditorFrameProps) {
  const { state, setState } = props;
  const isLoaded = !state.isLoading;

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
          setState={setState}
        />
      }
      configPanel={
        isLoaded && (
          <ConfigPanelWrapper
            datasourceMap={props.datasourceMap}
            datasourceStates={state.datasourceStates}
            visualizationMap={props.visualizationMap}
            activeVisualizationId={state.visualization.activeId}
            setState={setState}
            visualizationState={state.visualization.state}
            framePublicAPI={props.framePublicAPI}
          />
        )
      }
      workspacePanel={
        isLoaded && (
          <WorkspacePanelWrapper title={state.title} setState={setState}>
            <WorkspacePanel
              activeDatasourceId={state.activeDatasourceId}
              activeVisualizationId={state.visualization.activeId}
              datasourceMap={props.datasourceMap}
              datasourceStates={state.datasourceStates}
              framePublicAPI={props.framePublicAPI}
              visualizationState={state.visualization.state}
              visualizationMap={props.visualizationMap}
              setState={setState}
              ExpressionRenderer={props.ExpressionRenderer}
            />
          </WorkspacePanelWrapper>
        )
      }
      suggestionsPanel={
        isLoaded && (
          <SuggestionPanel
            frame={props.framePublicAPI}
            activeDatasourceId={state.activeDatasourceId}
            activeVisualizationId={state.visualization.activeId}
            datasourceMap={props.datasourceMap}
            datasourceStates={state.datasourceStates}
            visualizationState={state.visualization.state}
            visualizationMap={props.visualizationMap}
            setState={setState}
            ExpressionRenderer={props.ExpressionRenderer}
          />
        )
      }
    />
  );
}
