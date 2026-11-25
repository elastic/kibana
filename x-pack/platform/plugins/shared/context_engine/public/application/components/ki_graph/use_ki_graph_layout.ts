/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import type { Edge, Node } from '@xyflow/react';
import { MarkerType, Position } from '@xyflow/react';
import { useMemo } from 'react';
import { forceLayout } from './force_layout';
import { getKiGraphNodeSize } from './ki_graph_node_size';
import type { KiGraph, KiGraphEdge, KiGraphEdgeData, KiGraphNodeData } from './types';
import type { KiGraphLabelPlacementNode } from './use_visible_label_ids';

const DIMMED_OPACITY = 0.15;
export const DEFAULT_EDGE_STROKE_WIDTH = 0.5;
const EDGE_ARROW_PIXELS = 5;

// @xyflow/react needs data that satisfies `Record<string, unknown>`, which interfaces don't.
type Plain<T> = { [K in keyof T]: T[K] };

export type KiGraphFlowNodeData = Plain<KiGraphNodeData> & {
  size: number;
  degree: number;
  isSelected: boolean;
  isHovered: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  isLabelForced: boolean;
  showLabel: boolean;
};

export type KiGraphFlowNode = Node<KiGraphFlowNodeData, 'kiNode'>;

export type KiGraphFlowEdge = Edge<Plain<KiGraphEdgeData>>;

interface KiGraphLayoutState {
  selectedId?: string;
  hoveredId?: string;
}

const getHighlightIds = (
  edges: readonly KiGraphEdge[],
  hoveredId: string | undefined,
  selectedId: string | undefined
): ReadonlySet<string> | undefined => {
  if (hoveredId !== undefined) {
    return getNeighborIds(edges, hoveredId);
  }
  if (selectedId !== undefined) {
    return getNeighborIds(edges, selectedId);
  }
  return undefined;
};

const getEdgeFocusId = (
  hoveredId: string | undefined,
  selectedId: string | undefined
): string | undefined => {
  if (hoveredId !== undefined) {
    return hoveredId;
  }
  return selectedId;
};

interface KiGraphLayoutResult {
  nodes: KiGraphFlowNode[];
  edges: KiGraphFlowEdge[];
  /** Depends only on the graph, so hovering doesn't recompute label placement. */
  labelNodes: readonly KiGraphLabelPlacementNode[];
}

export const getNeighborIds = (
  edges: readonly KiGraphEdge[],
  nodeId: string
): ReadonlySet<string> => {
  const ids = new Set<string>([nodeId]);
  for (const edge of edges) {
    if (edge.source === nodeId) {
      ids.add(edge.target);
    }
    if (edge.target === nodeId) {
      ids.add(edge.source);
    }
  }
  return ids;
};

export const getDegreeById = (graph: KiGraph): ReadonlyMap<string, number> => {
  const degrees = new Map<string, number>();
  for (const { kiId } of graph.nodes) {
    degrees.set(kiId, 0);
  }

  const edgeKeys = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.source === edge.target) {
      continue;
    }
    const lo = edge.source < edge.target ? edge.source : edge.target;
    const hi = edge.source < edge.target ? edge.target : edge.source;
    const key = `${lo}\0${hi}`;
    if (edgeKeys.has(key)) {
      continue;
    }
    edgeKeys.add(key);
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
  }

  return degrees;
};

export const useKiGraphLayout = (
  graph: KiGraph,
  state: KiGraphLayoutState
): KiGraphLayoutResult => {
  const { euiTheme } = useEuiTheme();
  const { selectedId, hoveredId } = state;

  const degreeById = useMemo(() => getDegreeById(graph), [graph]);

  const centers = useMemo(() => {
    const layoutNodes = graph.nodes.map((node) => {
      const degree = degreeById.get(node.kiId) ?? 0;
      const size = getKiGraphNodeSize(node, degree);
      return { id: node.kiId, radius: size / 2 };
    });
    return forceLayout(
      layoutNodes,
      graph.edges.map(({ source, target }) => ({ source, target }))
    );
  }, [graph, degreeById]);

  const labelNodes = useMemo(
    () =>
      graph.nodes.map((node): KiGraphLabelPlacementNode => {
        const { kiId, title, occurrences } = node;
        const degree = degreeById.get(kiId) ?? 0;
        const size = getKiGraphNodeSize(node, degree);
        const center = centers.get(kiId);
        return {
          id: kiId,
          title,
          degree,
          occurrences,
          size,
          position: { x: (center?.x ?? 0) - size / 2, y: (center?.y ?? 0) - size / 2 },
        };
      }),
    [graph, degreeById, centers]
  );

  return useMemo(() => {
    const highlightIds = getHighlightIds(graph.edges, hoveredId, selectedId);
    const focusId = getEdgeFocusId(hoveredId, selectedId);

    const nodes: KiGraphFlowNode[] = graph.nodes.map((nodeData) => {
      const degree = degreeById.get(nodeData.kiId) ?? 0;
      const size = getKiGraphNodeSize(nodeData, degree);
      const center = centers.get(nodeData.kiId);
      const x = (center?.x ?? 0) - size / 2;
      const y = (center?.y ?? 0) - size / 2;
      const inHighlight = highlightIds?.has(nodeData.kiId) ?? false;
      const isSelected = selectedId === nodeData.kiId;
      const isHovered = hoveredId === nodeData.kiId;

      let zIndex = 0;
      if (isHovered) {
        zIndex = 2;
      } else if (isSelected) {
        zIndex = 1;
      }

      return {
        id: nodeData.kiId,
        type: 'kiNode',
        position: { x, y },
        width: size,
        height: size,
        // Fresh node objects drop RF's measured handle bounds, which makes every edge vanish.
        measured: { width: size, height: size },
        handles: [
          { type: 'target', position: Position.Top, x: size / 2, y: size / 2, width: 1, height: 1 },
          { type: 'source', position: Position.Top, x: size / 2, y: size / 2, width: 1, height: 1 },
        ],
        zIndex,
        targetPosition: Position.Top,
        sourcePosition: Position.Top,
        data: {
          ...nodeData,
          size,
          degree,
          isSelected,
          isHovered,
          isHighlighted: highlightIds !== undefined && inHighlight,
          isDimmed: highlightIds !== undefined && !inHighlight,
          isLabelForced: highlightIds !== undefined && inHighlight,
          showLabel: false,
        },
      };
    });

    const defaultStroke = euiTheme.colors.mediumShade;
    const highlightStroke = euiTheme.colors.primary;
    const defaultStrokeWidth = DEFAULT_EDGE_STROKE_WIDTH;

    // Marker units follow the stroke width, so the size is divided out to keep arrows constant.
    const arrowMarker = (stroke: string, strokeWidth: number) => ({
      type: MarkerType.ArrowClosed,
      width: EDGE_ARROW_PIXELS / strokeWidth,
      height: EDGE_ARROW_PIXELS / strokeWidth,
      color: stroke,
    });
    const hasFocus = focusId !== undefined;

    const edges: KiGraphFlowEdge[] = graph.edges.map((edge) => {
      const isConnectedToFocus = edge.source === focusId || edge.target === focusId;
      const isDimmed = hasFocus && !isConnectedToFocus;

      let style: { stroke: string; strokeWidth: number; opacity?: number } = {
        stroke: defaultStroke,
        strokeWidth: defaultStrokeWidth,
      };

      if (isConnectedToFocus) {
        const focusStrokeWidth = hoveredId !== undefined && hasFocus ? 1.25 : 1;
        style = { stroke: highlightStroke, strokeWidth: focusStrokeWidth };
      } else if (isDimmed) {
        style = { stroke: defaultStroke, strokeWidth: defaultStrokeWidth, opacity: DIMMED_OPACITY };
      }

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'kiEdge',
        data: { relation: edge.relation },
        style,
        markerEnd: arrowMarker(style.stroke, style.strokeWidth),
        zIndex: isConnectedToFocus ? 1 : 0,
      };
    });

    return { nodes, edges, labelNodes };
  }, [
    centers,
    labelNodes,
    degreeById,
    euiTheme.colors.mediumShade,
    euiTheme.colors.primary,
    graph,
    hoveredId,
    selectedId,
  ]);
};
