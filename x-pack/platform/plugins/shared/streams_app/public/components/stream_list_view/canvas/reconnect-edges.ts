/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Keeps a flow connected when a node in the middle of it is deleted.
//
// React Flow removes a deleted node together with every edge attached to it,
// which would leave the node's upstream and downstream neighbours disconnected.
// `computeReconnectingEdges` returns the replacement edges that stitch each
// surviving upstream node back to each surviving downstream node "through" the
// deleted node(s) — so the node disappears but the connection between its
// neighbours persists.

import type { Edge, Node } from '@xyflow/react';

export function computeReconnectingEdges(
  deletedIds: string[],
  edges: Edge[],
  nodes: Node[]
): Edge[] {
  if (!deletedIds.length) return [];

  const deleted = new Set(deletedIds);
  const typeOf = new Map(nodes.map((node) => [node.id, node.type]));
  // Transient routing connector pucks aren't real flow steps, so never treat
  // them as a reconnection endpoint.
  const isReal = (id: string) => typeOf.get(id) !== 'routingEndpoint';

  // Group the deleted nodes into connected components (treating edges between two
  // deleted nodes as undirected links) so that deleting a whole CHAIN (A → B)
  // reconnects its outer neighbours (S → T) once, rather than trying to stitch
  // the intermediate deleted nodes back to each other.
  const adjacency = new Map<string, string[]>();
  deletedIds.forEach((id) => adjacency.set(id, []));
  for (const edge of edges) {
    if (deleted.has(edge.source) && deleted.has(edge.target)) {
      adjacency.get(edge.source)!.push(edge.target);
      adjacency.get(edge.target)!.push(edge.source);
    }
  }

  const componentOf = new Map<string, number>();
  let componentCount = 0;
  for (const id of deletedIds) {
    if (componentOf.has(id)) continue;
    const stack = [id];
    componentOf.set(id, componentCount);
    while (stack.length) {
      const current = stack.pop()!;
      for (const neighbour of adjacency.get(current) ?? []) {
        if (!componentOf.has(neighbour)) {
          componentOf.set(neighbour, componentCount);
          stack.push(neighbour);
        }
      }
    }
    componentCount += 1;
  }

  // For each component collect the surviving upstream ends (edges entering it)
  // and downstream ends (edges leaving it), preserving handles so the
  // reconnected edge exits/enters at the same points as before.
  const entriesByComponent: Array<Array<{ source: string; sourceHandle?: string | null }>> =
    Array.from({ length: componentCount }, () => []);
  const exitsByComponent: Array<Array<{ target: string; targetHandle?: string | null }>> =
    Array.from({ length: componentCount }, () => []);

  for (const edge of edges) {
    const sourceDeleted = deleted.has(edge.source);
    const targetDeleted = deleted.has(edge.target);
    if (!sourceDeleted && targetDeleted && isReal(edge.source)) {
      entriesByComponent[componentOf.get(edge.target)!].push({
        source: edge.source,
        sourceHandle: edge.sourceHandle,
      });
    } else if (sourceDeleted && !targetDeleted && isReal(edge.target)) {
      exitsByComponent[componentOf.get(edge.source)!].push({
        target: edge.target,
        targetHandle: edge.targetHandle,
      });
    }
  }

  const existingKeys = new Set(
    edges.map(
      (edge) => `${edge.source}|${edge.sourceHandle ?? ''}->${edge.target}|${edge.targetHandle ?? ''}`
    )
  );
  const createdKeys = new Set<string>();
  const reconnecting: Edge[] = [];

  for (let component = 0; component < componentCount; component += 1) {
    for (const entry of entriesByComponent[component]) {
      for (const exit of exitsByComponent[component]) {
        if (entry.source === exit.target) continue; // no self-loops
        const key = `${entry.source}|${entry.sourceHandle ?? ''}->${exit.target}|${
          exit.targetHandle ?? ''
        }`;
        if (existingKeys.has(key) || createdKeys.has(key)) continue;
        createdKeys.add(key);
        reconnecting.push({
          id: `e-reconnect-${entry.source}-${exit.target}-${createdKeys.size}`,
          source: entry.source,
          target: exit.target,
          type: 'pipelineRouting',
          ...(entry.sourceHandle ? { sourceHandle: entry.sourceHandle } : {}),
          ...(exit.targetHandle ? { targetHandle: exit.targetHandle } : {}),
        });
      }
    }
  }

  return reconnecting;
}
