/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GraphData,
  RuntimeGraph,
  WorkspaceLayoutController,
} from '../../types/workspace_state';
import {
  materializeRuntimeEdge,
  materializeRuntimeNode,
  planIncomingEdges,
  prepareIncomingNodes,
} from './graph_merge_planner';

export const mergeRuntimeGraph = (
  runtimeGraph: RuntimeGraph,
  graph: GraphData,
  initialSequence: number,
  layoutController: WorkspaceLayoutController
): number => {
  layoutController.stop();
  const { normalizedNodes, newNodes } = prepareIncomingNodes(
    graph.nodes,
    new Set(Object.keys(runtimeGraph.nodesMap))
  );
  graph.nodes = normalizedNodes;

  let sequence = initialSequence;
  newNodes.forEach((incomingNode) => {
    const node = materializeRuntimeNode(incomingNode, sequence++);
    runtimeGraph.nodes.push(node);
    runtimeGraph.nodesMap[node.id] = node;
  });

  planIncomingEdges({
    edges: graph.edges,
    nodes: normalizedNodes,
    existingEdges: runtimeGraph.edgesMap,
  }).forEach((operation) => {
    if (operation.type === 'update') {
      const edge = runtimeGraph.edgesMap[operation.id];
      edge.weight = operation.weight;
      edge.doc_count = operation.docCount;
      return;
    }

    const edge = materializeRuntimeEdge(operation, runtimeGraph.nodesMap);
    runtimeGraph.edgesMap[edge.id] = edge;
    runtimeGraph.edges.push(edge);
  });

  layoutController.start();
  return sequence;
};
