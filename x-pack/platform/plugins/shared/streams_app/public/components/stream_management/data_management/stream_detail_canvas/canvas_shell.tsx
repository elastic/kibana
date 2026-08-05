/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  type CoordinateExtent,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeMouseHandler,
  type NodeSelectionChange,
  type NodeTypes,
  type OnEdgesChange,
  type OnNodeDrag,
  type OnNodesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  FIT_VIEW_PADDING,
  GRID_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  NODE_HEIGHT_ESTIMATE,
  NODE_WIDTH_ESTIMATE,
  PAN_MARGIN,
  SNAP_SIZE,
} from './canvas_constants';
import { CanvasMinimap } from './canvas_minimap';
import { CanvasZoomControls } from './canvas_zoom_controls';
import { canvasEdgeTypes, canvasNodeTypes } from './registry';

// Lines are purely visual connectors that animate on hover — they can't be
// selected or clicked. Module-level so the object/function identity stays stable
// across renders.
const NON_SELECTABLE_EDGE_OPTIONS = { selectable: false };
const noop = () => {};

export const getCanvasContainerStyles = (euiTheme: UseEuiTheme['euiTheme']) => css`
  position: relative;
  // Fill the remaining height of the page section's flex column instead of a
  // fixed viewport calc, so the surface always matches the visible area and the
  // floating controls (toolbar, zoom, minimap) stay put when the window resizes.
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  background: ${euiTheme.colors.backgroundBaseSubdued};

  // Communicate pannable space: open hand at rest, grabbing while dragging.
  .react-flow__pane {
    cursor: grab;
  }
  .react-flow__pane.dragging {
    cursor: grabbing;
  }

  // Connection handles (the dots at each end of an edge) share the resting edge
  // color so the source -> destination connector reads as one continuous line.
  .react-flow__handle {
    background: ${euiTheme.colors.borderBaseProminent};
    border-color: ${euiTheme.colors.borderBaseProminent};
  }
`;

/**
 * Bounds panning to the graph's footprint plus a comfortable margin so people
 * can move a little past the content but never drift into infinite empty space.
 * Uses each node's measured DOM size when React Flow has it, falling back to a
 * rough estimate on the first render.
 */
const getTranslateExtent = (nodes: Node[]): CoordinateExtent | undefined => {
  if (nodes.length === 0) {
    return undefined;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const width = node.measured?.width ?? NODE_WIDTH_ESTIMATE;
    const height = node.measured?.height ?? NODE_HEIGHT_ESTIMATE;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }

  return [
    [minX - PAN_MARGIN, minY - PAN_MARGIN],
    [maxX + PAN_MARGIN, maxY + PAN_MARGIN],
  ];
};

interface CanvasShellProps<NodeType extends Node, EdgeType extends Edge> {
  nodes: NodeType[];
  edges: EdgeType[];
  /** Defaults to the shared registry; the mock canvas overrides with its own. */
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  onNodesChange?: OnNodesChange<NodeType>;
  onEdgesChange?: OnEdgesChange<EdgeType>;
  onNodeClick?: NodeMouseHandler<NodeType>;
  onNodeContextMenu?: NodeMouseHandler<NodeType>;
  onNodeDragStart?: OnNodeDrag<NodeType>;
  onPaneContextMenu?: (event: MouseEvent | React.MouseEvent) => void;
  /**
   * Right-click on the multi-selection overlay. React Flow fires this instead of
   * `onNodeContextMenu` once more than one node is selected.
   */
  onSelectionContextMenu?: (event: React.MouseEvent, nodes: NodeType[]) => void;
  nodesDraggable?: boolean;
  nodesConnectable?: boolean;
  elementsSelectable?: boolean;
  /** Whether nodes are keyboard-focusable (Tab). Defaults to `true`. */
  nodesFocusable?: boolean;
  /** Whether edges are keyboard-focusable (Tab). Defaults to `false` (edges are non-actionable). */
  edgesFocusable?: boolean;
  /** Accessible name for the interactive canvas region. */
  ariaLabel?: string;
  /** Id of an element describing the canvas keyboard controls. */
  ariaDescribedById?: string;
  /** Overlay slot rendered above the canvas (e.g. context menu, toolbar, flyout). */
  children?: React.ReactNode;
}

/**
 * Shared canvas shell owning the React Flow provider, container, common viewport
 * configuration (zoom bounds, trackpad panning, dotted grid), and the custom
 * zoom/fit controls. Both the classic and mock canvases render through this so
 * the control chrome and look-and-feel stay consistent.
 */
export function CanvasShell<NodeType extends Node = Node, EdgeType extends Edge = Edge>({
  nodes,
  edges,
  nodeTypes = canvasNodeTypes,
  edgeTypes = canvasEdgeTypes,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onNodeContextMenu,
  onNodeDragStart,
  onPaneContextMenu,
  onSelectionContextMenu,
  nodesDraggable,
  nodesConnectable = false,
  elementsSelectable,
  nodesFocusable = true,
  edgesFocusable = false,
  ariaLabel,
  ariaDescribedById,
  children,
}: CanvasShellProps<NodeType, EdgeType>) {
  const { euiTheme } = useEuiTheme();

  const translateExtent = useMemo(() => getTranslateExtent(nodes), [nodes]);

  // Tabbing focuses a node's DOM wrapper. Mirror that focus into React Flow's
  // selection so the focused node shows the standard selection styling without an
  // extra Enter press. Selection flows through `onNodesChange` (the same channel
  // React Flow uses) so it works while nodes are controlled by the parent.
  const handleFocus = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (!onNodesChange) {
        return;
      }
      const nodeElement = (event.target as HTMLElement).closest('.react-flow__node');
      const focusedId = nodeElement?.getAttribute('data-id');
      const focusVisible = nodeElement ? nodeElement.matches(':focus-visible') : false;
      if (!focusedId || !focusVisible) {
        return;
      }
      const changes = nodes
        .filter((node) => node.selected !== (node.id === focusedId))
        .map<NodeSelectionChange>((node) => ({
          id: node.id,
          type: 'select',
          selected: node.id === focusedId,
        }));
      if (changes.length > 0) {
        onNodesChange(changes);
      }
    },
    [nodes, onNodesChange]
  );

  return (
    <ReactFlowProvider>
      <EuiPanel
        hasShadow={false}
        hasBorder={false}
        paddingSize="none"
        css={getCanvasContainerStyles(euiTheme)}
        data-test-subj="streamsCanvasTab"
        role="application"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedById}
        onFocus={handleFocus}
      >
        <ReactFlow<NodeType, EdgeType>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeClick={noop}
          onNodeClick={onNodeClick}
          onNodeContextMenu={onNodeContextMenu}
          onNodeDragStart={onNodeDragStart}
          onPaneContextMenu={onPaneContextMenu}
          onSelectionContextMenu={onSelectionContextMenu}
          nodesDraggable={nodesDraggable}
          nodesConnectable={nodesConnectable}
          elementsSelectable={elementsSelectable}
          nodesFocusable={nodesFocusable}
          edgesFocusable={edgesFocusable}
          defaultEdgeOptions={NON_SELECTABLE_EDGE_OPTIONS}
          fitView
          fitViewOptions={{ padding: FIT_VIEW_PADDING }}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          translateExtent={translateExtent}
          panOnScroll
          zoomOnScroll={false}
          zoomOnPinch
          selectionKeyCode="Shift"
          multiSelectionKeyCode="Shift"
          selectionMode={SelectionMode.Partial}
          snapToGrid
          snapGrid={[SNAP_SIZE, SNAP_SIZE]}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={GRID_SIZE} color={euiTheme.colors.borderBasePlain} />
          <CanvasZoomControls />
          <CanvasMinimap />
        </ReactFlow>
        {children}
      </EuiPanel>
    </ReactFlowProvider>
  );
}
