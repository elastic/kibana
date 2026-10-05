/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FramePublicAPI, Visualization } from '@kbn/lens-common';

/**
 * Filters out layers hidden from the layer UI (e.g. the metric trendline
 * layer), which do not render as layer panels or tabs.
 */
export const getVisibleLayerIds = ({
  activeVisualization,
  visualizationState,
  framePublicAPI,
  layerIds,
}: {
  activeVisualization: Visualization;
  visualizationState: unknown;
  framePublicAPI: FramePublicAPI;
  layerIds: string[];
}): string[] =>
  layerIds.filter(
    (layerId) =>
      !activeVisualization.getConfiguration({
        layerId,
        frame: framePublicAPI,
        state: visualizationState,
      }).hidden
  );
