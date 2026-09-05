/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DESTINATION_NODE_TYPE, SOURCE_NODE_TYPE } from './types';

export type FlowDirection = 'up' | 'down' | 'both';

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

export interface ConnectedFlow {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

export type HoverTarget = { kind: 'node'; id: string } | { kind: 'edge'; id: string };

/**
 * Event-flow direction for a node kind: sources only feed forward, destinations
 * only look back, and mid-stream kinds (pipeline, routing, …) walk both ways.
 */
export const flowDirectionFor = (nodeType: string | undefined): FlowDirection => {
  if (nodeType === SOURCE_NODE_TYPE) {
    return 'down';
  }
  if (nodeType === DESTINATION_NODE_TYPE) {
    return 'up';
  }
  return 'both';
};

const walk = (
  startId: string,
  edges: readonly FlowEdge[],
  forward: boolean,
  nodeIds: Set<string>,
  edgeIds: Set<string>
): void => {
  const adjacency = new Map<string, FlowEdge[]>();
  for (const edge of edges) {
    const key = forward ? edge.source : edge.target;
    const bucket = adjacency.get(key);
    if (bucket) {
      bucket.push(edge);
    } else {
      adjacency.set(key, [edge]);
    }
  }

  const stack = [startId];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined) {
      break;
    }
    for (const edge of adjacency.get(id) ?? []) {
      edgeIds.add(edge.id);
      const next = forward ? edge.target : edge.source;
      if (!nodeIds.has(next)) {
        nodeIds.add(next);
        stack.push(next);
      }
    }
  }
};

/** Directed reachability from a node: downstream, upstream, or both. */
export const getConnectedFlow = (
  startId: string,
  edges: readonly FlowEdge[],
  direction: FlowDirection
): ConnectedFlow => {
  const nodeIds = new Set<string>([startId]);
  const edgeIds = new Set<string>();

  if (direction === 'down' || direction === 'both') {
    walk(startId, edges, true, nodeIds, edgeIds);
  }
  if (direction === 'up' || direction === 'both') {
    walk(startId, edges, false, nodeIds, edgeIds);
  }

  return { nodeIds, edgeIds };
};

/**
 * Path an edge sits on: upstream of its source, the edge itself, and downstream
 * of its target — so a fan-out does not light up sibling branches.
 */
export const getConnectedFlowForEdge = (
  edge: FlowEdge,
  edges: readonly FlowEdge[]
): ConnectedFlow => {
  const nodeIds = new Set<string>([edge.source, edge.target]);
  const edgeIds = new Set<string>([edge.id]);
  walk(edge.source, edges, false, nodeIds, edgeIds);
  walk(edge.target, edges, true, nodeIds, edgeIds);
  return { nodeIds, edgeIds };
};

/** Resolves the spotlighted flow from hover (preferred) or a single selection. */
export const getActiveFlow = ({
  hovered,
  selectedIds,
  edges,
  nodeTypeById,
}: {
  hovered: HoverTarget | null;
  selectedIds: readonly string[];
  edges: readonly FlowEdge[];
  nodeTypeById: ReadonlyMap<string, string | undefined>;
}): ConnectedFlow | null => {
  if (hovered?.kind === 'node') {
    return getConnectedFlow(hovered.id, edges, flowDirectionFor(nodeTypeById.get(hovered.id)));
  }
  if (hovered?.kind === 'edge') {
    const edge = edges.find((item) => item.id === hovered.id);
    return edge ? getConnectedFlowForEdge(edge, edges) : null;
  }
  if (selectedIds.length === 1) {
    const id = selectedIds[0];
    return getConnectedFlow(id, edges, flowDirectionFor(nodeTypeById.get(id)));
  }
  return null;
};
