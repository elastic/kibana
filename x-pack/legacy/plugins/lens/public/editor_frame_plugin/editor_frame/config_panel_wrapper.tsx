/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useContext, memo } from 'react';
import { NativeRenderer } from '../../native_renderer';
import { Visualization, FramePublicAPI, Datasource, SetState } from '../../types';
import { DragContext } from '../../drag_drop';
import { ChartSwitch } from './chart_switch';
import { updateVisualizationState } from '../../state_management';

interface ConfigPanelWrapperProps {
  visualizationState: unknown;
  visualizationMap: Record<string, Visualization>;
  activeVisualizationId: string | null;
  setState: SetState;
  framePublicAPI: FramePublicAPI;
  datasourceMap: Record<string, Datasource>;
  datasourceStates: Record<
    string,
    {
      isLoading: boolean;
      state: unknown;
    }
  >;
}

export const ConfigPanelWrapper = memo(function ConfigPanelWrapper(props: ConfigPanelWrapperProps) {
  const context = useContext(DragContext);
  const setVisualizationState = useMemo(
    () => (newState: unknown) => updateVisualizationState(props.setState, newState),
    [props.setState]
  );

  return (
    <>
      <ChartSwitch
        data-test-subj="lnsChartSwitcher"
        visualizationMap={props.visualizationMap}
        visualizationId={props.activeVisualizationId}
        visualizationState={props.visualizationState}
        datasourceMap={props.datasourceMap}
        datasourceStates={props.datasourceStates}
        setState={props.setState}
        framePublicAPI={props.framePublicAPI}
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
