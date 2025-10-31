/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import type { FramePublicAPI, Visualization } from '@kbn/lens-common';
import {
  useLensDispatch,
  updateVisualizationState,
  useLensSelector,
  selectVisualizationState,
  selectVisualization,
} from '../../state_management';
import { useEditorFrameService } from '../editor_frame_service_context';

const VisualizationToolbar = memo(function VisualizationToolbar({
  activeVisualization,
  framePublicAPI,
  enableFlyoutToolbar = false,
}: {
  activeVisualization: Visualization | null;
  framePublicAPI: FramePublicAPI;
  enableFlyoutToolbar?: boolean;
}) {
  const dispatchLens = useLensDispatch();
  const visualization = useLensSelector(selectVisualizationState);
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
    activeVisualization ?? {};

  let ToolbarComponent;
  if (enableFlyoutToolbar) {
    ToolbarComponent = FlyoutToolbarComponent ?? RegularToolbarComponent;
  } else {
    ToolbarComponent = RegularToolbarComponent;
  }

  if (!ToolbarComponent) {
    return null;
  }

  return ToolbarComponent({
    frame: framePublicAPI,
    state: visualization.state,
    setState: setVisualizationState,
  });
});

export function VisualizationToolbarWrapper({
  framePublicAPI,
}: {
  framePublicAPI: FramePublicAPI;
}) {
  const { visualizationMap } = useEditorFrameService();
  const visualization = useLensSelector(selectVisualization);

  const activeVisualization = visualization.activeId
    ? visualizationMap[visualization.activeId]
    : null;

  return activeVisualization && visualization.state ? (
    <VisualizationToolbar
      framePublicAPI={framePublicAPI}
      activeVisualization={activeVisualization}
    />
  ) : null;
}
