/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The canvas minimap: a light panel of type-colored "blips". Clicking recenters
// the viewport; blips outside the hovered flow dim to mirror the canvas
// spotlight. Rendered as a child of <ReactFlow> (so it can read the viewport).

import React, { useCallback } from 'react';
import { MiniMap, useReactFlow, type Node } from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

interface CanvasMinimapProps {
  // The currently-hovered flow (from the spotlight feature); blips outside it
  // are dimmed. Null when nothing is hovered.
  hoveredFlow: { nodeIds: Set<string>; edgeIds: Set<string> } | null;
}

export function CanvasMinimap({ hoveredFlow }: CanvasMinimapProps) {
  const { euiTheme } = useEuiTheme();
  const { setCenter } = useReactFlow();

  const nodeColor = useCallback(
    (node: Node) => {
      if (hoveredFlow && !hoveredFlow.nodeIds.has(node.id)) {
        return euiTheme.colors.lightShade; // dimmed (outside the hovered flow)
      }
      switch (node.type) {
        case 'source':
          return euiTheme.colors.primary;
        case 'destination':
          return euiTheme.colors.success;
        case 'routing':
          return euiTheme.colors.accent;
        default:
          return euiTheme.colors.mediumShade; // pipeline & fallback
      }
    },
    [hoveredFlow, euiTheme]
  );

  const className = css`
    background-color: ${euiTheme.colors.backgroundBasePlain} !important;
    border-radius: ${euiTheme.border.radius.medium};
    overflow: hidden;
    box-shadow: 0 0 0 1px ${euiTheme.colors.borderBaseSubdued}, 0 2px 8px rgba(43, 57, 79, 0.12);
    .react-flow__minimap-node {
      transition: fill 120ms ease;
    }
  `;

  return (
    <MiniMap
      className={className}
      pannable
      zoomable
      nodeColor={nodeColor}
      nodeStrokeWidth={2}
      nodeBorderRadius={3}
      maskColor="rgba(105, 112, 125, 0.18)"
      maskStrokeColor={euiTheme.colors.mediumShade}
      ariaLabel="Canvas minimap"
      onClick={(_event, position) => setCenter(position.x, position.y, { duration: 350 })}
    />
  );
}
