/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Directed reachability used by the hover-to-spotlight feature. Highlighting
// follows the direction events actually flow:
//   - a SOURCE highlights everywhere an event could go TO   (downstream)
//   - a DESTINATION highlights everywhere an event could come FROM (upstream)
//   - a PIPELINE / ROUTING node highlights both
// This means sibling destinations that merely share an ancestor are NOT
// highlighted, since an event can't travel between them.

import type { Edge } from '@xyflow/react';

export type FlowDirection = 'down' | 'up' | 'both';

// Which direction to spotlight when hovering a node of the given type.
export function flowDirectionFor(nodeType: string | undefined): FlowDirection {
  if (nodeType === 'source') return 'down';
  if (nodeType === 'destination') return 'up';
  return 'both'; // pipeline, routing, routingEndpoint, group, …
}

// All nodes/edges reachable from `startId` by walking edges in the requested
// direction(s). Edges are collected as they are traversed, so only edges that
// actually lie on a directed path through `startId` are included.
export function reachableFlow(
  startId: string,
  edges: Edge[],
  direction: FlowDirection
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set<string>([startId]);
  const edgeIds = new Set<string>();

  const walk = (forward: boolean) => {
    const adjacency = new Map<string, Edge[]>();
    edges.forEach((e) => {
      const key = forward ? e.source : e.target;
      if (!adjacency.has(key)) adjacency.set(key, []);
      adjacency.get(key)!.push(e);
    });
    const stack = [startId];
    while (stack.length) {
      const id = stack.pop()!;
      for (const e of adjacency.get(id) ?? []) {
        edgeIds.add(e.id);
        const next = forward ? e.target : e.source;
        if (!nodeIds.has(next)) {
          nodeIds.add(next);
          stack.push(next);
        }
      }
    }
  };

  if (direction === 'down' || direction === 'both') walk(true);
  if (direction === 'up' || direction === 'both') walk(false);

  return { nodeIds, edgeIds };
}

// Every node reachable (in either direction) from any of `seedIds` — i.e. the
// full stream(s) those nodes belong to. Used by the "Select stream" action,
// which expands a selection to all connected elements.
export function undirectedComponent(seedIds: string[], edges: Edge[]): Set<string> {
  const adjacency = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a)!.add(b);
  };
  edges.forEach((e) => {
    link(e.source, e.target);
    link(e.target, e.source);
  });
  const visited = new Set<string>(seedIds);
  const stack = [...seedIds];
  while (stack.length) {
    const id = stack.pop()!;
    for (const nb of adjacency.get(id) ?? []) {
      if (!visited.has(nb)) {
        visited.add(nb);
        stack.push(nb);
      }
    }
  }
  return visited;
}
