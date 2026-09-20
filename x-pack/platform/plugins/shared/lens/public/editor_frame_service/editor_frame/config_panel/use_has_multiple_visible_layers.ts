/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { FramePublicAPI, Visualization } from '@kbn/lens-common';
import { getVisibleLayerIds } from './get_visible_layer_ids';

export const useHasMultipleVisibleLayers = ({
  activeVisualization,
  visualizationState,
  framePublicAPI,
}: {
  activeVisualization?: Visualization | null;
  visualizationState: unknown;
  framePublicAPI: FramePublicAPI;
}): boolean =>
  useMemo(() => {
    if (!activeVisualization || visualizationState == null) {
      return false;
    }

    return (
      getVisibleLayerIds({
        activeVisualization,
        visualizationState,
        framePublicAPI,
        layerIds: activeVisualization.getLayerIds(visualizationState),
      }).length > 1
    );
  }, [activeVisualization, framePublicAPI, visualizationState]);
