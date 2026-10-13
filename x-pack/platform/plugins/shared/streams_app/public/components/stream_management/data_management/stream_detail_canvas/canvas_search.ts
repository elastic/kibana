/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConnectedFlow, type ConnectedFlow } from './connected_flow';
import type { ClassicCanvasEdge, ClassicCanvasGraph, ClassicCanvasNode } from './types';

export const normalizeCanvasQuery = (query: string | null | undefined): string | null => {
  const normalized = query?.trim().toLowerCase();
  return normalized ? normalized : null;
};

const getNodeSearchText = (node: ClassicCanvasNode): string =>
  [node.data.title, node.data.subtitle, node.data.streamName]
    .filter((text): text is string => typeof text === 'string')
    .join(' ')
    .toLowerCase();

export const resolveCanvasSearch = (
  graph: ClassicCanvasGraph,
  query: string | null
): ConnectedFlow | undefined => {
  const normalizedQuery = normalizeCanvasQuery(query);
  if (!normalizedQuery) {
    return undefined;
  }
  const matchingNodeIds = graph.nodes
    .filter((node) => getNodeSearchText(node).includes(normalizedQuery))
    .map((node) => node.id);
  return getConnectedFlow(matchingNodeIds, graph.edges);
};

/**
 * Hides everything outside the matched flows. Unconfigured placeholders stay
 * visible so a node added while searching does not vanish.
 */
export const applyCanvasSearch = <
  NodeType extends ClassicCanvasNode,
  EdgeType extends ClassicCanvasEdge
>(
  nodes: NodeType[],
  edges: EdgeType[],
  flow: ConnectedFlow | undefined
): { nodes: NodeType[]; edges: EdgeType[] } => {
  if (!flow) {
    return { nodes, edges };
  }
  return {
    nodes: nodes.map((node) => ({
      ...node,
      hidden: !flow.nodeIds.has(node.id) && !node.data.unconfiguredNodeId,
    })),
    edges: edges.map((edge) => ({ ...edge, hidden: !flow.edgeIds.has(edge.id) })),
  };
};
