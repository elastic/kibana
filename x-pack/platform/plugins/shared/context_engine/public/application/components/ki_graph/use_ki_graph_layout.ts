/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Edge, Node } from '@xyflow/react';
import { Position } from '@xyflow/react';
import { useMemo } from 'react';
import { forceLayout } from './force_layout';
import type { KiGraph, KiGraphEdge, KiGraphEdgeData, KiGraphNodeData } from './types';

export const KI_GRAPH_NODE_WIDTH = 210;
export const KI_GRAPH_NODE_HEIGHT = 60;

const DIMMED_OPACITY = 0.15;

// @xyflow/react needs data that satisfies `Record<string, unknown>`, which interfaces don't.
type Plain<T> = { [K in keyof T]: T[K] };

export type KiGraphFlowNodeData = Plain<KiGraphNodeData> & {
  isSelected: boolean;
  isDimmed: boolean;
};

export type KiGraphFlowNode = Node<KiGraphFlowNodeData, 'kiNode'>;

export type KiGraphFlowEdge = Edge<Plain<KiGraphEdgeData>>;

interface KiGraphLayoutState {
  selectedId?: string;
}

interface KiGraphLayoutResult {
  nodes: KiGraphFlowNode[];
  edges: KiGraphFlowEdge[];
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

export const useKiGraphLayout = (
  graph: KiGraph,
  state: KiGraphLayoutState
): KiGraphLayoutResult => {
  const { selectedId } = state;

  // The layout only depends on the graph, so selecting a node doesn't move anything.
  const positions = useMemo(
    () =>
      forceLayout(
        graph.nodes.map(({ kiId }) => ({
          id: kiId,
          width: KI_GRAPH_NODE_WIDTH,
          height: KI_GRAPH_NODE_HEIGHT,
        })),
        graph.edges.map(({ source, target }) => ({ source, target }))
      ),
    [graph]
  );

  return useMemo(() => {
    const highlightIds =
      selectedId === undefined ? undefined : getNeighborIds(graph.edges, selectedId);

    const nodes: KiGraphFlowNode[] = graph.nodes.map((nodeData) => {
      const position = positions.get(nodeData.kiId);
      return {
        id: nodeData.kiId,
        type: 'kiNode',
        position: { x: position?.x ?? 0, y: position?.y ?? 0 },
        width: KI_GRAPH_NODE_WIDTH,
        height: KI_GRAPH_NODE_HEIGHT,
        targetPosition: Position.Top,
        sourcePosition: Position.Top,
        data: {
          ...nodeData,
          isSelected: selectedId === nodeData.kiId,
          isDimmed: highlightIds !== undefined && !highlightIds.has(nodeData.kiId),
        },
      };
    });

    const edges: KiGraphFlowEdge[] = graph.edges.map((edge) => {
      const isConnectedToSelection = edge.source === selectedId || edge.target === selectedId;
      const isDimmed = selectedId !== undefined && !isConnectedToSelection;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'straight',
        // Labels on every edge overlap, so only the selected node's edges show one.
        label: isConnectedToSelection ? edge.relation : undefined,
        data: { relation: edge.relation },
        style: isDimmed ? { opacity: DIMMED_OPACITY } : undefined,
        zIndex: isConnectedToSelection ? 1 : 0,
      };
    });

    return { nodes, edges };
  }, [graph, positions, selectedId]);
};
