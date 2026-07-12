/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The canvas minimap: a collapsible panel pinned to the bottom-left of the
// canvas. Expanded, it shows a light preview of type-colored "blips" with a
// primary-bordered viewport rectangle; clicking recenters the viewport and
// blips outside the hovered flow dim to mirror the canvas spotlight. Collapsed,
// it shrinks to a single map-icon button. Rendered as a child of <ReactFlow>
// (so the MiniMap can read the viewport).

import React, { useCallback, useState } from 'react';
import { MiniMap, useReactFlow, type Node } from '@xyflow/react';
import { EuiButtonIcon, EuiFlexGroup, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { MapFoldedIcon } from './map-folded-icon';

interface CanvasMinimapProps {
  // The currently-hovered flow (from the spotlight feature); blips outside it
  // are dimmed. Null when nothing is hovered.
  hoveredFlow: { nodeIds: Set<string>; edgeIds: Set<string> } | null;
}

const MINIMAP_WIDTH = 150;
const MINIMAP_HEIGHT = 90;

export function CanvasMinimap({ hoveredFlow }: CanvasMinimapProps) {
  const { euiTheme } = useEuiTheme();
  const { setCenter } = useReactFlow();
  const [collapsed, setCollapsed] = useState(false);

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

  const expandLabel = i18n.translate('xpack.streams.streamsCanvas.showMinimap', {
    defaultMessage: 'Show minimap',
  });
  const collapseLabel = i18n.translate('xpack.streams.streamsCanvas.hideMinimap', {
    defaultMessage: 'Hide minimap',
  });

  if (collapsed) {
    return (
      <EuiPanel
        element="button"
        grow={false}
        hasShadow={false}
        hasBorder
        paddingSize="none"
        aria-label={expandLabel}
        title={expandLabel}
        onClick={() => setCollapsed(false)}
        className={css`
          position: absolute;
          left: 24px;
          bottom: 24px;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: ${euiTheme.size.s};
          /* EuiPanel's isClickable style forces width: 100% on enabled buttons;
             override it so the collapsed button stays a 32px square. */
          inline-size: 32px !important;
          block-size: 32px;
          border-radius: ${euiTheme.border.radius.medium};
          color: ${euiTheme.colors.textParagraph};
          &:hover {
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
          }
        `}
      >
        <MapFoldedIcon />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="xs"
      className={css`
        position: absolute;
        left: 24px;
        bottom: 24px;
        z-index: 5;
        border-radius: ${euiTheme.border.radius.medium};
      `}
    >
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="none" responsive={false}>
        <EuiButtonIcon
          iconType="minus"
          color="text"
          size="xs"
          aria-label={collapseLabel}
          title={collapseLabel}
          onClick={() => setCollapsed(true)}
        />
      </EuiFlexGroup>
      <MiniMap
        className={css`
          position: relative !important;
          inset: auto !important;
          margin: 0 !important;
          background-color: ${euiTheme.colors.backgroundBaseSubdued} !important;
          border-radius: ${euiTheme.border.radius.small};
          .react-flow__minimap-node {
            transition: fill 120ms ease;
          }
        `}
        style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
        pannable
        zoomable
        nodeColor={nodeColor}
        nodeStrokeWidth={2}
        nodeBorderRadius={3}
        maskColor="rgba(105, 112, 125, 0.14)"
        maskStrokeColor={euiTheme.colors.primary}
        maskStrokeWidth={2}
        ariaLabel="Canvas minimap"
        onClick={(_event, position) => setCenter(position.x, position.y, { duration: 350 })}
      />
    </EuiPanel>
  );
}
