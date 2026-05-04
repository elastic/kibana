/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Dagre from '@dagrejs/dagre';
import { Position, type Node, type Edge } from '@xyflow/react';

// Fixed x positions for each column (left edge of the column band)
const COLUMN_X = { shippers: 0, endpoints: 500, streams: 900 } as const;

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 80;

const LANE_GAP = 40;
const RANKSEP = 40;
const NODESEP = 20;
const MARGINX = 10;
const MARGINY = 10;

type FlowColumn = 'shippers' | 'endpoints' | 'streams';
type FlowLane = 'agents' | 'agentless' | 'prometheus' | 'pipelines' | 'bulk' | 'streams';

interface FlowNodeData {
  column: FlowColumn;
  lane: FlowLane;
  parentId?: string;
  [key: string]: unknown;
}

/**
 * Layout a set of nodes in a single Dagre TB graph.
 * Returns the Dagre-positioned y values and sets x to the provided columnX.
 */
const layoutColumnNodes = <T extends Node<FlowNodeData>>(
  columnNodes: T[],
  edges: Edge[],
  columnX: number
): T[] => {
  if (columnNodes.length === 0) return columnNodes;

  const g = new Dagre.graphlib.Graph({ directed: true, compound: false })
    .setGraph({
      rankdir: 'TB',
      ranksep: RANKSEP,
      nodesep: NODESEP,
      marginx: MARGINX,
      marginy: MARGINY,
    })
    .setDefaultEdgeLabel(() => ({}));

  columnNodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  const nodeIds = new Set(columnNodes.map((n) => n.id));
  edges.forEach((edge) => {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  Dagre.layout(g);

  return columnNodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;
    return {
      ...node,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      position: {
        x: columnX,
        y: Math.round(dagreNode.y - NODE_HEIGHT / 2),
      },
    };
  });
};

/**
 * Layout nodes within a single lane using Dagre TB, returning y positions
 * relative to yOffset.
 */
const layoutLaneNodes = <T extends Node<FlowNodeData>>(
  laneNodes: T[],
  edges: Edge[],
  columnX: number,
  yOffset: number
): T[] => {
  if (laneNodes.length === 0) return laneNodes;

  const g = new Dagre.graphlib.Graph({ directed: true, compound: false })
    .setGraph({
      rankdir: 'TB',
      ranksep: RANKSEP,
      nodesep: NODESEP,
      marginx: MARGINX,
      marginy: MARGINY,
    })
    .setDefaultEdgeLabel(() => ({}));

  // Group agents by their parentId (policy group) to cluster them together
  // by adding virtual edges between siblings under the same parent
  const nodeIds = new Set(laneNodes.map((n) => n.id));

  laneNodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Add real edges within the lane
  edges.forEach((edge) => {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  // Add sibling edges for nodes that share a parentId (agents under same policy)
  // so Dagre keeps them adjacent in y
  const byParent = new Map<string, T[]>();
  for (const node of laneNodes) {
    const pid = (node.data as FlowNodeData).parentId;
    if (pid) {
      const list = byParent.get(pid) ?? [];
      list.push(node);
      byParent.set(pid, list);
    }
  }
  for (const siblings of byParent.values()) {
    for (let i = 0; i < siblings.length - 1; i++) {
      const src = siblings[i].id;
      const tgt = siblings[i + 1].id;
      if (g.hasNode(src) && g.hasNode(tgt) && !g.hasEdge(src, tgt)) {
        g.setEdge(src, tgt);
      }
    }
  }

  Dagre.layout(g);

  return laneNodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;
    return {
      ...node,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      position: {
        x: columnX,
        y: yOffset + Math.round(dagreNode.y - NODE_HEIGHT / 2),
      },
    };
  });
};

/**
 * Compute the bounding-box height of a set of already-positioned nodes.
 */
const getBoundingHeight = (nodes: Array<Node<FlowNodeData>>): number => {
  if (nodes.length === 0) return 0;
  let maxBottom = 0;
  for (const node of nodes) {
    const bottom = node.position.y + NODE_HEIGHT;
    if (bottom > maxBottom) maxBottom = bottom;
  }
  return maxBottom;
};

/**
 * Main layout function — port / adaptation of Fleet's applyCompoundLayout for
 * the 3-column (shippers / endpoints / streams), 3-lane-in-shippers topology.
 *
 * Algorithm:
 * 1. Shippers column: split into 3 lanes (agents / agentless / prometheus).
 *    Each lane gets its own Dagre TB run. Lanes are stacked vertically with
 *    LANE_GAP between them.
 * 2. Endpoints column: single Dagre TB run.
 * 3. Streams column: single Dagre TB run (parent→child edges give tree shape).
 * 4. All x values are fixed to COLUMN_X bucket — Dagre only determines y.
 */
export const applyFlowLayout = <T extends Node<FlowNodeData>>(
  nodes: T[],
  edges: Edge[]
): { nodes: T[]; edges: Edge[] } => {
  if (nodes.length === 0) return { nodes, edges };

  // ── Partition by column ────────────────────────────────────────────────────
  const shippersNodes = nodes.filter((n) => n.data.column === 'shippers');
  const endpointsNodes = nodes.filter((n) => n.data.column === 'endpoints');
  const streamsNodes = nodes.filter((n) => n.data.column === 'streams');

  // ── Shippers: 3 lanes ──────────────────────────────────────────────────────
  const agentsLane = shippersNodes.filter((n) => n.data.lane === 'agents');
  const agentlessLane = shippersNodes.filter((n) => n.data.lane === 'agentless');
  const prometheusLane = shippersNodes.filter((n) => n.data.lane === 'prometheus');

  const laidOutAgents = layoutLaneNodes(agentsLane, edges, COLUMN_X.shippers, 0);
  const agentsHeight = getBoundingHeight(laidOutAgents);

  const agentlessOffset = agentsHeight > 0 ? agentsHeight + LANE_GAP : 0;
  const laidOutAgentless = layoutLaneNodes(
    agentlessLane,
    edges,
    COLUMN_X.shippers,
    agentlessOffset
  );
  const agentlessHeight = getBoundingHeight(
    laidOutAgentless.map((n) => ({ ...n, position: { x: 0, y: n.position.y - agentlessOffset } }))
  );

  const prometheusOffset = agentlessOffset + (agentlessHeight > 0 ? agentlessHeight + LANE_GAP : 0);
  const laidOutPrometheus = layoutLaneNodes(
    prometheusLane,
    edges,
    COLUMN_X.shippers,
    prometheusOffset
  );

  const laidOutShippers = [...laidOutAgents, ...laidOutAgentless, ...laidOutPrometheus];

  // ── Endpoints column ───────────────────────────────────────────────────────
  const laidOutEndpoints = layoutColumnNodes(endpointsNodes, edges, COLUMN_X.endpoints);

  // ── Streams column ─────────────────────────────────────────────────────────
  const laidOutStreams = layoutColumnNodes(streamsNodes, edges, COLUMN_X.streams);

  // ── Reassemble in original order ───────────────────────────────────────────
  const positionById = new Map<string, { x: number; y: number }>();
  const handleById = new Map<string, { sourcePosition: Position; targetPosition: Position }>();

  for (const n of [...laidOutShippers, ...laidOutEndpoints, ...laidOutStreams]) {
    positionById.set(n.id, n.position);
    handleById.set(n.id, {
      sourcePosition: (n as { sourcePosition?: Position }).sourcePosition ?? Position.Right,
      targetPosition: (n as { targetPosition?: Position }).targetPosition ?? Position.Left,
    });
  }

  const resultNodes = nodes.map((node) => {
    const pos = positionById.get(node.id);
    const handles = handleById.get(node.id);
    if (!pos) return node;
    return {
      ...node,
      ...handles,
      position: pos,
    };
  });

  return { nodes: resultNodes, edges };
};
