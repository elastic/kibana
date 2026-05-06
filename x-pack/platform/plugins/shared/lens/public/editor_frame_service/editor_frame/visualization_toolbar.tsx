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
import { getLensFeatureFlags } from '../../get_feature_flags';
import {
  SchemaFlyoutEditor,
  hasSchemaForVisualization,
} from '../../shared_components/schema_flyout';

export const VisualizationToolbarWrapper = memo(function VisualizationToolbar({
  framePublicAPI,
  isInlineEditing = false,
}: {
  framePublicAPI: FramePublicAPI;
  isInlineEditing?: boolean;
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

  const { schemaFlyoutEditor: schemaFlyoutEditorEnabled } = getLensFeatureFlags();

  if (schemaFlyoutEditorEnabled && hasSchemaForVisualization(activeVisualization.id)) {
    return SchemaFlyoutEditor({
      visualizationId: activeVisualization.id,
      state: visualizationState.state,
      setState: setVisualizationState,
    });
  }

  const { FlyoutToolbarComponent } = activeVisualization;

  if (!FlyoutToolbarComponent) {
    return null;
  }

  return FlyoutToolbarComponent({
    frame: framePublicAPI,
    state: visualizationState.state,
    setState: setVisualizationState,
    isInlineEditing,
  });
});
