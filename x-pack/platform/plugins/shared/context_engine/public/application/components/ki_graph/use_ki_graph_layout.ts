/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import type { Edge, Node } from '@xyflow/react';
import { MarkerType, Position } from '@xyflow/react';
import { useEffect, useMemo, useState } from 'react';
import type { ForceLayoutParams, ForcePosition, KiGraphCenterParams } from './force_layout';
import {
  DEFAULT_FORCE_LAYOUT_PARAMS,
  DEFAULT_KI_GRAPH_CENTER_PARAMS,
  createForceLayoutRunner,
} from './force_layout';
import type { KiGraphNodeSizeParams } from './ki_graph_node_size';
import { DEFAULT_KI_GRAPH_NODE_SIZE_PARAMS, getKiGraphNodeSize } from './ki_graph_node_size';
import type { KiGraph, KiGraphEdge, KiGraphEdgeData, KiGraphNodeData } from './types';
import type { KiGraphLabelPlacementNode } from './use_visible_label_ids';

export const DEFAULT_EDGE_STROKE_WIDTH = 0.5;
const EDGE_ARROW_PIXELS = 5;
const FRAME_BUDGET_MS = 8;

// @xyflow/react needs data that satisfies `Record<string, unknown>`, which interfaces don't.
type Plain<T> = { [K in keyof T]: T[K] };

export type KiGraphFlowNodeData = Plain<KiGraphNodeData> & {
  size: number;
  degree: number;
};

export type KiGraphFlowNode = Node<KiGraphFlowNodeData, 'kiNode'>;

export type KiGraphFlowEdge = Edge<Plain<KiGraphEdgeData>>;

export interface KiGraphLayoutTuningParams {
  force: ForceLayoutParams;
  nodeSize: KiGraphNodeSizeParams;
  center: KiGraphCenterParams;
}

export const DEFAULT_KI_GRAPH_LAYOUT_TUNING_PARAMS: KiGraphLayoutTuningParams = {
  force: DEFAULT_FORCE_LAYOUT_PARAMS,
  nodeSize: DEFAULT_KI_GRAPH_NODE_SIZE_PARAMS,
  center: DEFAULT_KI_GRAPH_CENTER_PARAMS,
};

interface SettledLayout {
  graph: KiGraph;
  degreeById: ReadonlyMap<string, number>;
  nodeSizeParams: KiGraphNodeSizeParams;
  centers: ReadonlyMap<string, ForcePosition>;
}

export interface KiGraphLayoutResult {
  nodes: KiGraphFlowNode[];
  edges: KiGraphFlowEdge[];
  /** Depends only on the graph, so hovering doesn't recompute label placement. */
  labelNodes: readonly KiGraphLabelPlacementNode[];
  layoutDurationMs: number;
  isLayoutRunning: boolean;
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

const buildLayoutInputNodes = (
  graph: KiGraph,
  degreeById: ReadonlyMap<string, number>,
  nodeSizeParams: KiGraphNodeSizeParams
) =>
  graph.nodes.map((node) => {
    const degree = degreeById.get(node.kiId) ?? 0;
    const size = getKiGraphNodeSize(node, degree, nodeSizeParams);
    const layoutNode: { id: string; radius: number; occurrences?: number } = {
      id: node.kiId,
      radius: size / 2,
    };
    if (node.occurrences !== undefined) {
      layoutNode.occurrences = node.occurrences;
    }
    return layoutNode;
  });

export const useKiGraphLayout = (
  graph: KiGraph,
  layoutParams: KiGraphLayoutTuningParams = DEFAULT_KI_GRAPH_LAYOUT_TUNING_PARAMS
): KiGraphLayoutResult => {
  const { force: forceParams, nodeSize: nodeSizeParams, center: centerParams } = layoutParams;
  const { euiTheme } = useEuiTheme();

  const degreeById = useMemo(() => getDegreeById(graph), [graph]);

  // Only settled layouts are published, so the previous one stays on screen until the next is ready.
  const [settled, setSettled] = useState<SettledLayout | undefined>(undefined);
  const [layoutDurationMs, setLayoutDurationMs] = useState(0);
  const [isLayoutRunning, setIsLayoutRunning] = useState(true);

  useEffect(() => {
    const layoutNodes = buildLayoutInputNodes(graph, degreeById, nodeSizeParams);
    const layoutEdges = graph.edges.map(({ source, target }) => ({ source, target }));
    const runner = createForceLayoutRunner(layoutNodes, layoutEdges, forceParams, centerParams);

    setIsLayoutRunning(true);

    const layoutStart = performance.now();
    let cancelled = false;
    let frameId = 0;

    const loop = () => {
      if (cancelled) {
        return;
      }
      const finished = runner.step(FRAME_BUDGET_MS);
      if (finished) {
        setSettled({ graph, degreeById, nodeSizeParams, centers: runner.getPositions() });
        setLayoutDurationMs(performance.now() - layoutStart);
        setIsLayoutRunning(false);
        return;
      }
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [graph, degreeById, forceParams, centerParams, nodeSizeParams]);

  const labelNodes = useMemo(() => {
    if (settled === undefined) {
      return [];
    }
    const {
      graph: settledGraph,
      degreeById: settledDegrees,
      nodeSizeParams: sizes,
      centers,
    } = settled;
    return settledGraph.nodes.map((node): KiGraphLabelPlacementNode => {
      const { kiId, title, occurrences } = node;
      const degree = settledDegrees.get(kiId) ?? 0;
      const size = getKiGraphNodeSize(node, degree, sizes);
      const center = centers.get(kiId);
      return {
        id: kiId,
        title,
        degree,
        occurrences,
        size,
        position: { x: (center?.x ?? 0) - size / 2, y: (center?.y ?? 0) - size / 2 },
      };
    });
  }, [settled]);

  const flow = useMemo((): Pick<KiGraphLayoutResult, 'nodes' | 'edges'> => {
    if (settled === undefined) {
      return { nodes: [], edges: [] };
    }
    const {
      graph: settledGraph,
      degreeById: settledDegrees,
      nodeSizeParams: sizes,
      centers,
    } = settled;
    const nodes: KiGraphFlowNode[] = settledGraph.nodes.map((nodeData) => {
      const degree = settledDegrees.get(nodeData.kiId) ?? 0;
      const size = getKiGraphNodeSize(nodeData, degree, sizes);
      const center = centers.get(nodeData.kiId);
      const x = (center?.x ?? 0) - size / 2;
      const y = (center?.y ?? 0) - size / 2;

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
        zIndex: 0,
        targetPosition: Position.Top,
        sourcePosition: Position.Top,
        data: {
          ...nodeData,
          size,
          degree,
        },
      };
    });

    const defaultStroke = euiTheme.colors.mediumShade;
    const defaultStrokeWidth = DEFAULT_EDGE_STROKE_WIDTH;

    const arrowMarker = (stroke: string, strokeWidth: number) => ({
      type: MarkerType.ArrowClosed,
      width: EDGE_ARROW_PIXELS / strokeWidth,
      height: EDGE_ARROW_PIXELS / strokeWidth,
      color: stroke,
    });

    const edges: KiGraphFlowEdge[] = settledGraph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'kiEdge',
      data: { relation: edge.relation },
      style: {
        stroke: defaultStroke,
        strokeWidth: defaultStrokeWidth,
      },
      markerEnd: arrowMarker(defaultStroke, defaultStrokeWidth),
      zIndex: 0,
    }));

    return { nodes, edges };
  }, [settled, euiTheme.colors.mediumShade]);

  return { ...flow, labelNodes, layoutDurationMs, isLayoutRunning };
};
