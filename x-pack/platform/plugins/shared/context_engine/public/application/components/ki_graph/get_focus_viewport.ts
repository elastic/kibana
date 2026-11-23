/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface FocusNode {
  id: string;
  position: { x: number; y: number };
}

interface FocusViewport {
  centerX: number;
  centerY: number;
  zoom: number;
}

interface FocusParams {
  nodes: readonly FocusNode[];
  focusId: string;
  /** The focused node and the nodes that must stay in view. */
  visibleIds: ReadonlySet<string>;
  nodeWidth: number;
  nodeHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  minZoom: number;
  maxZoom: number;
}

const VIEW_MARGIN = 1.3;

/** Centers the focused node and zooms out just enough to keep every visible node in view. */
export const getFocusViewport = ({
  nodes,
  focusId,
  visibleIds,
  nodeWidth,
  nodeHeight,
  canvasWidth,
  canvasHeight,
  minZoom,
  maxZoom,
}: FocusParams): FocusViewport | undefined => {
  const focused = nodes.find(({ id }) => id === focusId);
  if (focused === undefined || canvasWidth <= 0 || canvasHeight <= 0) {
    return undefined;
  }

  const centerX = focused.position.x + nodeWidth / 2;
  const centerY = focused.position.y + nodeHeight / 2;

  // The node stays at the center, so the view must cover the farthest node on each axis.
  const { halfWidth, halfHeight } = nodes.reduce(
    (extent, { id, position }) =>
      visibleIds.has(id)
        ? {
            halfWidth: Math.max(
              extent.halfWidth,
              Math.abs(position.x + nodeWidth / 2 - centerX) + nodeWidth / 2
            ),
            halfHeight: Math.max(
              extent.halfHeight,
              Math.abs(position.y + nodeHeight / 2 - centerY) + nodeHeight / 2
            ),
          }
        : extent,
    { halfWidth: nodeWidth / 2, halfHeight: nodeHeight / 2 }
  );

  const fitZoom = Math.min(
    canvasWidth / (2 * halfWidth * VIEW_MARGIN),
    canvasHeight / (2 * halfHeight * VIEW_MARGIN)
  );

  return { centerX, centerY, zoom: Math.min(maxZoom, Math.max(minZoom, fitZoom)) };
};
