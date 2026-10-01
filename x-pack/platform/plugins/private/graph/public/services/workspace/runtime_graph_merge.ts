/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphData, RuntimeWorkspace } from '../../types/workspace_state';
import {
  materializeRuntimeEdge,
  materializeRuntimeNode,
  planIncomingEdges,
  prepareIncomingNodes,
} from './graph_merge_planner';

export const mergeRuntimeGraph = (
  workspace: RuntimeWorkspace,
  graph: GraphData,
  initialSequence: number
): number => {
  workspace.layoutController.stop();
  const { normalizedNodes, newNodes } = prepareIncomingNodes(
    graph.nodes,
    new Set(Object.keys(workspace.nodesMap))
  );
  graph.nodes = normalizedNodes;
  workspace.options.nodeLabeller?.(newNodes);

  let sequence = initialSequence;
  newNodes.forEach((incomingNode) => {
    const node = materializeRuntimeNode(incomingNode, sequence++);
    workspace.nodes.push(node);
    workspace.nodesMap[node.id] = node;
  });

  planIncomingEdges({
    edges: graph.edges,
    nodes: normalizedNodes,
    existingEdges: workspace.edgesMap,
  }).forEach((operation) => {
    if (operation.type === 'update') {
      const edge = workspace.edgesMap[operation.id];
      edge.weight = operation.weight;
      edge.doc_count = operation.docCount;
      return;
    }

    const edge = materializeRuntimeEdge(operation, workspace.nodesMap);
    workspace.edgesMap[edge.id] = edge;
    workspace.edges.push(edge);
  });

  workspace.layoutController.start();
  return sequence;
};
