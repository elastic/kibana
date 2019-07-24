/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useContext, memo } from 'react';
import { EuiSelect } from '@elastic/eui';
import { NativeRenderer } from '../../native_renderer';
import { Action } from './state_management';
import { Visualization, FramePublicAPI, VisualizationSuggestion } from '../../types';
import { DragContext } from '../../drag_drop';

interface ConfigPanelWrapperProps {
  visualizationState: unknown;
  visualizationMap: Record<string, Visualization>;
  activeVisualizationId: string | null;
  dispatch: (action: Action) => void;
  framePublicAPI: FramePublicAPI;
}

function getSuggestedVisualizationState(frame: FramePublicAPI, visualization: Visualization) {
  const datasources = Object.entries(frame.datasourceLayers);

  let results: VisualizationSuggestion[] = [];

  datasources.forEach(([layerId, datasource]) => {
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

    results = results.concat(suggestions);
  });

  if (!results.length) {
    return visualization.initialize(frame);
  }

  return visualization.initialize(frame, results[0].state);
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
      <EuiSelect
        data-test-subj="visualization-switch"
        options={Object.keys(props.visualizationMap).map(visualizationId => ({
          value: visualizationId,
          text: visualizationId,
        }))}
        value={props.activeVisualizationId || undefined}
        onChange={e => {
          const newState = getSuggestedVisualizationState(
            props.framePublicAPI,
            props.visualizationMap[e.target.value]
          );
          props.dispatch({
            type: 'SWITCH_VISUALIZATION',
            newVisualizationId: e.target.value,
            initialState: newState,
          });
        }}
      />
      {props.activeVisualizationId && props.visualizationState !== null && (
        <NativeRenderer
          render={props.visualizationMap[props.activeVisualizationId].renderConfigPanel}
          nativeProps={{
            dragDropContext: context,
            state: props.visualizationState,
            setState: setVisualizationState,
            frame: props.framePublicAPI,
          }}
        />
      )}
    </>
  );
});
