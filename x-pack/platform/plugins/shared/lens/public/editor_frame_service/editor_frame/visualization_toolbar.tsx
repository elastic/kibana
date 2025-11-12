/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo, useCallback } from 'react';
import type { FramePublicAPI } from '@kbn/lens-common';
import {
  useLensDispatch,
  updateVisualizationState,
  useLensSelector,
  selectVisualizationState,
  selectVisualization,
} from '../../state_management';
import { useEditorFrameService } from '../editor_frame_service_context';

export const VisualizationToolbarWrapper = memo(function VisualizationToolbar({
  framePublicAPI,
  isInlineEditing = false,
  enableFlyoutToolbar = true,
}: {
  framePublicAPI: FramePublicAPI;
  isInlineEditing?: boolean;
  enableFlyoutToolbar?: boolean;
}) {
  const dispatchLens = useLensDispatch();
  const lensVisualization = useLensSelector(selectVisualization);
  const visualizationState = useLensSelector(selectVisualizationState);

  const { visualizationMap } = useEditorFrameService();

  const activeVisualization = lensVisualization.activeId
    ? visualizationMap[lensVisualization.activeId]
    : null;

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

  if (!activeVisualization || !visualizationState) {
    return null;
  }

  const { FlyoutToolbarComponent, ToolbarComponent: RegularToolbarComponent } =
    activeVisualization ?? {};

  const ToolbarComponent = enableFlyoutToolbar
    ? FlyoutToolbarComponent ?? RegularToolbarComponent
    : RegularToolbarComponent;

  if (!ToolbarComponent) {
    return null;
  }

  return ToolbarComponent({
    frame: framePublicAPI,
    state: visualizationState.state,
    setState: setVisualizationState,
    isInlineEditing,
  });
});
