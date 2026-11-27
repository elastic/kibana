/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { graphlib } from '@dagrejs/dagre';

export function getAllPredecessors(graph: graphlib.Graph, nodeId: string): string[] {
  const predecessors = graph.predecessors(nodeId);
  if (!predecessors) {
    return [];
  }
  return predecessors.flatMap((predecessor) => [
    predecessor,
    ...getAllPredecessors(graph, predecessor),
  ]);
}
