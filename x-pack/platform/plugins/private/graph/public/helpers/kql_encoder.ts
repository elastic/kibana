/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';

import type { RuntimeGraph, WorkspaceNode } from '../types';
import { unpackGroupedNodes } from '../services/workspace/runtime_grouping';

function escapeQuotes(str: string) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function getSelectedOrAllNodes(
  runtimeGraph: RuntimeGraph,
  selectedNodeIds: readonly string[]
): WorkspaceNode[] {
  if (selectedNodeIds.length === 0) {
    return runtimeGraph.nodes;
  }
  const selectedNodes = selectedNodeIds
    .map((nodeId) => runtimeGraph.nodesMap[nodeId])
    .filter((node): node is WorkspaceNode => node !== undefined);
  return unpackGroupedNodes(selectedNodes, runtimeGraph.edges);
}

export function asKQL(
  runtimeGraph: RuntimeGraph,
  selectedNodeIds: readonly string[],
  joinBy: 'and' | 'or'
) {
  const nodes = getSelectedOrAllNodes(runtimeGraph, selectedNodeIds);
  const clauses = nodes.map(
    (node) => `"${escapeQuotes(node.data.field)}" : "${escapeQuotes(node.data.term)}"`
  );

  const expression = clauses.join(` ${joinBy} `);

  return encodeURIComponent(rison.encode(expression));
}
