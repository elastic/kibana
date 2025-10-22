/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import type { FramePublicAPI, Visualization } from '../../types';
import {
  useLensDispatch,
  updateVisualizationState,
  useLensSelector,
  selectVisualizationState,
} from '../../state_management';

export function VisualizationToolbar(props: {
  activeVisualization: Visualization | null;
  framePublicAPI: FramePublicAPI;
  enableFlyoutToolbar?: boolean;
}) {
  const dispatchLens = useLensDispatch();
  const visualization = useLensSelector(selectVisualizationState);
  const { activeVisualization, enableFlyoutToolbar = false } = props;
  const setVisualizationState = useCallback(
    (newState: unknown) => {
      if (!activeVisualization) {
        return;
      }
      dispatchLens(
        updateVisualizationState({
          visualizationId: activeVisualization.id,
          newState,
        })
      );
    },
    [dispatchLens, activeVisualization]
  );

  const { FlyoutToolbarComponent, ToolbarComponent: RegularToolbarComponent } =
    activeVisualization || {};

  let ToolbarComponent;
  if (enableFlyoutToolbar) {
    ToolbarComponent = FlyoutToolbarComponent || RegularToolbarComponent;
  } else {
    ToolbarComponent = RegularToolbarComponent;
  }

  return (
    <>
      {ToolbarComponent && (
        <EuiFlexItem grow={false}>
          {ToolbarComponent({
            frame: props.framePublicAPI,
            state: visualization.state,
            setState: setVisualizationState,
          })}
        </EuiFlexItem>
      )}
    </>
  );
}
