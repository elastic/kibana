/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Position, type Node, type Edge } from '@xyflow/react';

// Fixed x positions for each column
const COLUMN_X = { shippers: 0, endpoints: 600, streams: 1050 } as const;

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 110;

const NODE_GAP = 20; // vertical gap between nodes in the same lane
const LANE_GAP = 50; // extra vertical gap between lanes within shippers

type FlowColumn = 'shippers' | 'endpoints' | 'streams';
type FlowLane = 'agents' | 'agentless' | 'prometheus' | 'pipelines' | 'bulk' | 'streams';

interface FlowNodeData {
  column: FlowColumn;
  lane: FlowLane;
  parentId?: string;
  [key: string]: unknown;
}

/**
 * Stack a list of nodes vertically starting at yOffset.
 * Returns positioned nodes and the y value after the last node.
 */
const stackNodes = <T extends Node<FlowNodeData>>(
  nodeList: T[],
  x: number,
  yStart: number
): { nodes: T[]; nextY: number } => {
  let y = yStart;
  const nodes = nodeList.map((node) => {
    const positioned = {
      ...node,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      position: { x, y },
    };
    y += NODE_HEIGHT + NODE_GAP;
    return positioned;
  });
  return { nodes, nextY: y };
};

/**
 * Order stream nodes so parents always come before their children,
 * and siblings are grouped together (depth-first tree walk).
 */
const orderStreamNodes = <T extends Node<FlowNodeData>>(nodes: T[]): T[] => {
  // Build children map from the data.parentId field
  const children = new Map<string | undefined, T[]>();
  for (const node of nodes) {
    const pid = (node.data as FlowNodeData).parentId;
    const list = children.get(pid) ?? [];
    list.push(node);
    children.set(pid, list);
  }

  const result: T[] = [];
  const visit = (id: string | undefined) => {
    const kids = children.get(id) ?? [];
    for (const kid of kids) {
      result.push(kid);
      visit(kid.id);
    }
  };

  // Roots: nodes whose parentId doesn't exist in the set
  const ids = new Set(nodes.map((n) => n.id));
  const roots = nodes.filter((n) => {
    const pid = (n.data as FlowNodeData).parentId;
    return !pid || !ids.has(pid);
  });

  for (const root of roots) {
    result.push(root);
    visit(root.id);
  }

  // Safety: add any nodes not yet visited (shouldn't happen)
  const visited = new Set(result.map((n) => n.id));
  for (const node of nodes) {
    if (!visited.has(node.id)) result.push(node);
  }

  return result;
};

/**
 * Order agent/agentPolicy nodes so each policy group is immediately
 * followed by its agent children.
 */
const orderAgentNodes = <T extends Node<FlowNodeData>>(nodes: T[]): T[] => {
  const groups = nodes.filter((n) => !(n.data as FlowNodeData).parentId);
  const agentsByPolicy = new Map<string, T[]>();
  for (const node of nodes) {
    const pid = (node.data as FlowNodeData).parentId;
    if (pid) {
      const list = agentsByPolicy.get(pid) ?? [];
      list.push(node);
      agentsByPolicy.set(pid, list);
    }
  }
  const result: T[] = [];
  for (const group of groups) {
    result.push(group);
    for (const agent of agentsByPolicy.get(group.id) ?? []) {
      result.push(agent);
    }
  }
  // Standalone agents (no group)
  for (const node of nodes) {
    if (!(node.data as FlowNodeData).parentId && !result.includes(node)) {
      result.push(node);
    }
  }
  return result;
};

/**
 * Main layout function.
 *
 * Uses simple vertical stacking per column/lane — Dagre is not used here
 * because columns are vertical lists, not graphs, and Dagre places all
 * disconnected nodes at y=0 (same rank), causing overlap.
 *
 * Shippers column: 3 lanes (agents → agentless → prometheus) stacked top-to-bottom.
 * Endpoints column: cloud pipelines then bulk, stacked.
 * Streams column: tree-ordered (depth-first) and stacked.
 */
export const applyFlowLayout = <T extends Node<FlowNodeData>>(
  nodes: T[],
  edges: Edge[]
): { nodes: T[]; edges: Edge[] } => {
  if (nodes.length === 0) return { nodes, edges };

  const byColumn = (col: FlowColumn) => nodes.filter((n) => n.data.column === col);
  const byLane = (lane: FlowLane) => nodes.filter((n) => n.data.lane === lane);

  // ── Shippers ──────────────────────────────────────────────────────────────
  const agentNodes = orderAgentNodes(byLane('agents'));
  const agentlessNodes = byLane('agentless');
  const prometheusNodes = byLane('prometheus');

  let y = 0;
  const { nodes: posAgents, nextY: afterAgents } = stackNodes(agentNodes, COLUMN_X.shippers, y);
  y = afterAgents + (agentNodes.length > 0 && agentlessNodes.length > 0 ? LANE_GAP : 0);

  const { nodes: posAgentless, nextY: afterAgentless } = stackNodes(
    agentlessNodes,
    COLUMN_X.shippers,
    y
  );
  y = afterAgentless + (agentlessNodes.length > 0 && prometheusNodes.length > 0 ? LANE_GAP : 0);

  const { nodes: posPrometheus } = stackNodes(prometheusNodes, COLUMN_X.shippers, y);

  // ── Endpoints ─────────────────────────────────────────────────────────────
  const pipelineNodes = byLane('pipelines');
  const bulkNodes = byLane('bulk');

  let ey = 0;
  const { nodes: posPipelines, nextY: afterPipelines } = stackNodes(
    pipelineNodes,
    COLUMN_X.endpoints,
    ey
  );
  ey = afterPipelines + (pipelineNodes.length > 0 && bulkNodes.length > 0 ? NODE_GAP : 0);
  const { nodes: posBulk } = stackNodes(bulkNodes, COLUMN_X.endpoints, ey);

  // ── Streams ───────────────────────────────────────────────────────────────
  const streamNodes = orderStreamNodes(byColumn('streams'));
  const { nodes: posStreams } = stackNodes(streamNodes, COLUMN_X.streams, 0);

  // ── Reassemble preserving original order ──────────────────────────────────
  const positionById = new Map<string, { x: number; y: number }>();
  for (const n of [
    ...posAgents,
    ...posAgentless,
    ...posPrometheus,
    ...posPipelines,
    ...posBulk,
    ...posStreams,
  ]) {
    positionById.set(n.id, n.position);
  }

  const resultNodes = nodes.map((node) => {
    const pos = positionById.get(node.id);
    if (!pos) return node;
    return {
      ...node,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      position: pos,
    };
  });

  return { nodes: resultNodes, edges };
};
