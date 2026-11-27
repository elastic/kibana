/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MarkerType } from '@xyflow/react';
import type { KiGraphFlowEdge } from './use_ki_graph_layout';
import { DEFAULT_EDGE_STROKE_WIDTH } from './use_ki_graph_layout';
import type { KiGraphRenderableFlowNode } from './ki_graph_node';

const EDGE_ARROW_PIXELS = 5;
interface KiGraphEdgeStrokeColors {
  readonly defaultStroke: string;
  readonly highlightStroke: string;
}

const arrowMarker = (stroke: string, strokeWidth: number) => ({
  type: MarkerType.ArrowClosed,
  width: EDGE_ARROW_PIXELS / strokeWidth,
  height: EDGE_ARROW_PIXELS / strokeWidth,
  color: stroke,
});

const focusEdgeStrokeWidth = (hasHoverFocus: boolean): number => {
  if (hasHoverFocus) {
    return 1.25;
  }
  return 1;
};

export const applyKiGraphEdgeFocusStyles = (
  edges: KiGraphFlowEdge[],
  focusId: string | undefined,
  hoveredId: string | undefined,
  { defaultStroke, highlightStroke }: KiGraphEdgeStrokeColors
): KiGraphFlowEdge[] => {
  const hasFocus = focusId !== undefined;
  let changed = false;
  const next = edges.map((edge) => {
    const isConnectedToFocus = hasFocus && (edge.source === focusId || edge.target === focusId);
    let stroke = defaultStroke;
    let strokeWidth = DEFAULT_EDGE_STROKE_WIDTH;
    let markerStroke = defaultStroke;
    let markerStrokeWidth = DEFAULT_EDGE_STROKE_WIDTH;

    if (isConnectedToFocus) {
      stroke = highlightStroke;
      markerStroke = highlightStroke;
      strokeWidth = focusEdgeStrokeWidth(hoveredId !== undefined);
      markerStrokeWidth = strokeWidth;
    }

    const style = {
      stroke,
      strokeWidth,
    };
    const markerEnd = arrowMarker(markerStroke, markerStrokeWidth);
    const previousStyle = edge.style ?? {};
    const styleUnchanged =
      previousStyle.stroke === style.stroke && previousStyle.strokeWidth === style.strokeWidth;
    const markerUnchanged =
      edge.markerEnd !== undefined &&
      typeof edge.markerEnd === 'object' &&
      'color' in edge.markerEnd &&
      edge.markerEnd.color === markerEnd.color &&
      edge.markerEnd.width === markerEnd.width;

    if (styleUnchanged && markerUnchanged) {
      return edge;
    }
    changed = true;
    return {
      ...edge,
      style,
      markerEnd,
    };
  });
  return changed ? next : edges;
};

const nodeZIndex = (
  nodeId: string,
  hoveredId: string | undefined,
  selectedId: string | undefined
): number => {
  if (nodeId === hoveredId) {
    return 2;
  }
  if (nodeId === selectedId) {
    return 1;
  }
  return 0;
};

export const applyKiGraphNodeZIndex = (
  nodes: KiGraphRenderableFlowNode[],
  hoveredId: string | undefined,
  selectedId: string | undefined
): KiGraphRenderableFlowNode[] => {
  let changed = false;
  const next = nodes.map((node) => {
    const zIndex = nodeZIndex(node.id, hoveredId, selectedId);
    if (node.zIndex === zIndex) {
      return node;
    }
    changed = true;
    return { ...node, zIndex };
  });
  return changed ? next : nodes;
};

const edgeZIndex = (edge: KiGraphFlowEdge, focusId: string | undefined): number => {
  if (focusId === undefined) {
    return 0;
  }
  if (edge.source === focusId || edge.target === focusId) {
    return 1;
  }
  return 0;
};

export const applyKiGraphEdgeZIndex = (
  edges: KiGraphFlowEdge[],
  focusId: string | undefined
): KiGraphFlowEdge[] => {
  let changed = false;
  const next = edges.map((edge) => {
    const zIndex = edgeZIndex(edge, focusId);
    if (edge.zIndex === zIndex) {
      return edge;
    }
    changed = true;
    return { ...edge, zIndex };
  });
  return changed ? next : edges;
};
