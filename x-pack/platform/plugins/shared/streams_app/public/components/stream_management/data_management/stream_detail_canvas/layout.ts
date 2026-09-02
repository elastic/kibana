/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Dagre from '@dagrejs/dagre';
import type { XYPosition } from '@xyflow/react';
import { COLUMN_GAP, NODE_HEIGHT_ESTIMATE, NODE_WIDTH_ESTIMATE, ROW_GAP } from './canvas_constants';

interface LayoutNode {
  id: string;
}

interface LayoutEdge {
  source: string;
  target: string;
}

// Dagre spaces nodes edge-to-edge, so translate the design's center-to-center
// column/row gaps into the separation dagre expects. A uniform node footprint
// keeps the flow on the same tidy grid regardless of each card's real width.
const RANK_SEPARATION = Math.max(COLUMN_GAP - NODE_WIDTH_ESTIMATE, 0);
const NODE_SEPARATION = Math.max(ROW_GAP - NODE_HEIGHT_ESTIMATE, 0);

/**
 * Dagre assigns each node to a rank by its depth in the flow and minimizes edge
 * crossings within each rank, so richer topologies (pipelines, routing, fan-out)
 * lay out cleanly without any bespoke graph code here. Independent flows are
 * stacked vertically. Positions are normalized so the graph's top-left sits at
 * the origin, and returned as React Flow top-left coordinates.
 *
 * For the current classic topology (one source -> destination pair per stream)
 * this still yields source in column 0, destination in column 1, one pair per
 * row.
 */
export const layoutGraph = (nodes: LayoutNode[], edges: LayoutEdge[]): Map<string, XYPosition> => {
  const positions = new Map<string, XYPosition>();
  if (nodes.length === 0) {
    return positions;
  }

  const graph = new Dagre.graphlib.Graph({ directed: true, compound: false })
    .setGraph({
      rankdir: 'LR',
      ranksep: RANK_SEPARATION,
      nodesep: NODE_SEPARATION,
      marginx: 0,
      marginy: 0,
    })
    .setDefaultEdgeLabel(() => ({}));

  const nodeIds = new Set(nodes.map((node) => node.id));
  nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH_ESTIMATE, height: NODE_HEIGHT_ESTIMATE });
  });
  edges.forEach(({ source, target }) => {
    if (nodeIds.has(source) && nodeIds.has(target)) {
      graph.setEdge(source, target);
    }
  });

  Dagre.layout(graph);

  // Dagre reports node centers; convert to top-left and normalize so the whole
  // graph starts at the origin (keeps callers and tests independent of dagre's
  // internal offsets).
  let minX = Infinity;
  let minY = Infinity;
  nodes.forEach((node) => {
    const laidOut = graph.node(node.id);
    if (!laidOut) {
      return;
    }
    minX = Math.min(minX, laidOut.x - NODE_WIDTH_ESTIMATE / 2);
    minY = Math.min(minY, laidOut.y - NODE_HEIGHT_ESTIMATE / 2);
  });
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
  }

  nodes.forEach((node) => {
    const laidOut = graph.node(node.id);
    if (!laidOut) {
      positions.set(node.id, { x: 0, y: 0 });
      return;
    }
    positions.set(node.id, {
      x: Math.round(laidOut.x - NODE_WIDTH_ESTIMATE / 2 - minX),
      y: Math.round(laidOut.y - NODE_HEIGHT_ESTIMATE / 2 - minY),
    });
  });

  return positions;
};

interface PositionedNode {
  id: string;
  position: XYPosition;
}

interface ApplyLayoutOptions {
  /**
   * When provided, only these nodes are re-laid-out (a "Tidy up selection");
   * everything else keeps its current position and the tidied block is anchored
   * to the selection's current top-left so it arranges in place instead of
   * jumping to the origin.
   */
  onlyIds?: Set<string>;
}

/**
 * Re-runs {@link layoutGraph} against live nodes and returns a new array with the
 * updated positions, preserving every other node property. This is the runtime
 * "Tidy up" action; the build-time graph builder keeps using `layoutGraph`
 * directly.
 */
export const applyLayout = <N extends PositionedNode>(
  nodes: N[],
  edges: LayoutEdge[],
  { onlyIds }: ApplyLayoutOptions = {}
): N[] => {
  const targetNodes = onlyIds ? nodes.filter((node) => onlyIds.has(node.id)) : nodes;
  if (targetNodes.length === 0) {
    return nodes;
  }

  const targetIds = new Set(targetNodes.map((node) => node.id));
  const targetEdges = edges.filter(
    (edge) => targetIds.has(edge.source) && targetIds.has(edge.target)
  );

  const positions = layoutGraph(targetNodes, targetEdges);

  // For a selection-only tidy, shift the laid-out block back onto the
  // selection's current top-left so it stays where the user is looking.
  let offsetX = 0;
  let offsetY = 0;
  if (onlyIds) {
    const laidPositions = [...positions.values()];
    const currentMinX = Math.min(...targetNodes.map((node) => node.position.x));
    const currentMinY = Math.min(...targetNodes.map((node) => node.position.y));
    const laidMinX = Math.min(...laidPositions.map((position) => position.x));
    const laidMinY = Math.min(...laidPositions.map((position) => position.y));
    offsetX = currentMinX - laidMinX;
    offsetY = currentMinY - laidMinY;
  }

  return nodes.map((node) => {
    const position = positions.get(node.id);
    if (!position) {
      return node;
    }
    return { ...node, position: { x: position.x + offsetX, y: position.y + offsetY } };
  });
};
