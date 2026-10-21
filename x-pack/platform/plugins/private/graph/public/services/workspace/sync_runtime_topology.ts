/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIcon } from '../../helpers/style_choices';
import type {
  RuntimeGraph,
  WorkspaceEdge,
  WorkspaceLayoutController,
  WorkspaceNode,
} from '../../types/workspace_state';
import type { WorkspaceState } from '../../state_management/workspace';

export const createRuntimeGraphFromState = (state: WorkspaceState): RuntimeGraph => {
  const nodesMap: Record<string, WorkspaceNode> = {};
  state.nodeIds.forEach((id) => {
    const node = state.nodesById[id];
    nodesMap[id] = {
      id,
      x: node.x,
      y: node.y,
      kx: node.x,
      ky: node.y,
      label: node.label,
      color: node.color,
      icon: getIcon(node.icon ?? ''),
      data: node.data,
      scaledSize: node.scaledSize,
      parent: null,
      numChildren: 0,
    };
  });
  state.nodeIds.forEach((id) => {
    const parentId = state.nodesById[id].parentId;
    if (parentId && nodesMap[parentId]) {
      nodesMap[id].parent = nodesMap[parentId];
      nodesMap[parentId].numChildren += 1;
    }
  });

  const edgesMap: Record<string, WorkspaceEdge> = {};
  state.edgeIds.forEach((id) => {
    const edge = state.edgesById[id];
    edgesMap[id] = {
      id,
      source: nodesMap[edge.sourceId],
      target: nodesMap[edge.targetId],
      topSrc: nodesMap[edge.topSourceId],
      topTarget: nodesMap[edge.topTargetId],
      label: edge.label,
      weight: edge.weight,
      width: edge.width,
      doc_count: edge.docCount,
    };
  });

  return {
    nodesMap,
    nodes: state.nodeIds.map((id) => nodesMap[id]),
    edgesMap,
    edges: state.edgeIds.map((id) => edgesMap[id]),
    blocklistedNodes: state.blocklistedNodeIds.map((id) => {
      const node = state.blocklistedNodesById[id];
      return {
        x: node.x,
        y: node.y,
        label: node.label,
        icon: getIcon(node.icon ?? ''),
        data: node.data,
        scaledSize: node.scaledSize,
        parent: null,
        color: node.color,
      };
    }),
  };
};

export const syncRuntimeTopology = (
  runtimeGraph: RuntimeGraph,
  state: WorkspaceState,
  layoutController: WorkspaceLayoutController
): void => {
  const synchronizedGraph = createRuntimeGraphFromState(state);
  runtimeGraph.nodesMap = synchronizedGraph.nodesMap;
  runtimeGraph.nodes = synchronizedGraph.nodes;
  runtimeGraph.edgesMap = synchronizedGraph.edgesMap;
  runtimeGraph.edges = synchronizedGraph.edges;
  runtimeGraph.blocklistedNodes = synchronizedGraph.blocklistedNodes;
  layoutController.start();
};
