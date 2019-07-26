/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useContext, memo } from 'react';
import { NativeRenderer } from '../../native_renderer';
import { Action } from './state_management';
import { Visualization, FramePublicAPI } from '../../types';
import { DragContext } from '../../drag_drop';
import { ConfigPanelHeader } from './config_panel_header';

interface ConfigPanelWrapperProps {
  visualizationState: unknown;
  visualizationMap: Record<string, Visualization>;
  activeVisualizationId: string | null;
  dispatch: (action: Action) => void;
  framePublicAPI: FramePublicAPI;
}

function getSuggestedVisualizationState(frame: FramePublicAPI, visualization: Visualization) {
  const [[layerId, datasource]] = Object.entries(frame.datasourceLayers);
  const suggestions = visualization.getSuggestions({
    tables: [
      {
        datasourceSuggestionId: 0,
        isMultiRow: true,
        columns: datasource.getTableSpec().map(col => ({
          ...col,
          operation: datasource.getOperationForColumnId(col.columnId)!,
        })),
        layerId,
      },
    ],
  });

  const suggestion = suggestions.length ? suggestions[0] : undefined;

  // Remove any layers that are not used by the new visualization. If we don't do this,
  // we get orphaned objects, and weird edge cases such as prompting the user that
  // layers are going to be dropped, when the user is unaware of any extraneous layers.
  Object.keys(frame.datasourceLayers).forEach(id => {
    if (!suggestion || id !== layerId) {
      frame.removeLayer(id);
    }
  });

  return visualization.initialize(frame, suggestion && suggestion.state);
}

export const ConfigPanelWrapper = memo(function ConfigPanelWrapper(props: ConfigPanelWrapperProps) {
  const context = useContext(DragContext);
  const setVisualizationState = useMemo(
    () => (newState: unknown) => {
      props.dispatch({
        type: 'UPDATE_VISUALIZATION_STATE',
        newState,
      });
    },
    [props.dispatch]
  );

  return (
    <>
      <ConfigPanelHeader
        visualizations={Object.values(props.visualizationMap)}
        visualizationId={props.activeVisualizationId}
        visualizationState={props.visualizationState}
        requireConfirmation={visualizationId =>
          props.activeVisualizationId !== visualizationId &&
          Object.keys(props.framePublicAPI.datasourceLayers).length > 1
        }
        onChange={({ visualizationId, subVisualizationId }) => {
          const visualization = props.visualizationMap[visualizationId];
          const switchVisualizationType = visualization.switchVisualizationType;

          if (visualizationId !== props.activeVisualizationId) {
            const newState = getSuggestedVisualizationState(props.framePublicAPI, visualization);
            props.dispatch({
              type: 'SWITCH_VISUALIZATION',
              newVisualizationId: visualizationId,
              initialState: switchVisualizationType
                ? switchVisualizationType(subVisualizationId, newState)
                : newState,
            });
          } else if (switchVisualizationType) {
            setVisualizationState(
              switchVisualizationType(subVisualizationId, props.visualizationState)
            );
          }
        }}
      />
      {props.activeVisualizationId && props.visualizationState !== null && (
        <div className="lnsConfigPanelWrapper">
          <NativeRenderer
            render={props.visualizationMap[props.activeVisualizationId].renderConfigPanel}
            nativeProps={{
              dragDropContext: context,
              state: props.visualizationState,
              setState: setVisualizationState,
              frame: props.framePublicAPI,
            }}
          />
        </div>
      )}
    </>
  );
});
