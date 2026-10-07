/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

export interface ConnectedFlow {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

const groupEdgesBy = (
  edges: readonly FlowEdge[],
  key: (edge: FlowEdge) => string
): Map<string, FlowEdge[]> => {
  const groups = new Map<string, FlowEdge[]>();
  for (const edge of edges) {
    const bucket = groups.get(key(edge));
    if (bucket) {
      bucket.push(edge);
    } else {
      groups.set(key(edge), [edge]);
    }
  }
  return groups;
};

/**
 * Everything upstream and downstream of the `startIds`, including the start
 * nodes themselves.
 */
export const getConnectedFlow = (
  startIds: readonly string[],
  edges: readonly FlowEdge[]
): ConnectedFlow => {
  const nodeIds = new Set<string>(startIds);
  const edgeIds = new Set<string>();

  const walkFlow = (adjacency: Map<string, FlowEdge[]>, next: (edge: FlowEdge) => string) => {
    const visited = new Set<string>(startIds);
    const queue = [...startIds];
    for (let head = 0; head < queue.length; head++) {
      for (const edge of adjacency.get(queue[head]) ?? []) {
        edgeIds.add(edge.id);
        const nextId = next(edge);
        nodeIds.add(nextId);
        if (!visited.has(nextId)) {
          visited.add(nextId);
          queue.push(nextId);
        }
      }
    }
  };

  walkFlow(
    groupEdgesBy(edges, (edge) => edge.source),
    (edge) => edge.target
  );
  walkFlow(
    groupEdgesBy(edges, (edge) => edge.target),
    (edge) => edge.source
  );

  return { nodeIds, edgeIds };
};
