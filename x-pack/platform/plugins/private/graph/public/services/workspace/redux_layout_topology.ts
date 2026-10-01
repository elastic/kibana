/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphState } from '../../state_management';
import type { RuntimeGraph, WorkspaceEdge, WorkspaceNode } from '../../types';

interface ReduxLayoutTopologyOptions {
  getState: () => GraphState | undefined;
  getRuntimeGraph: () => RuntimeGraph | undefined;
}

/** Supplies mutable D3 objects in the normalized topology order owned by Redux. */
export class ReduxLayoutTopology {
  constructor(private readonly options: ReduxLayoutTopologyOptions) {}

  public getNodes(): WorkspaceNode[] {
    const runtimeGraph = this.options.getRuntimeGraph();
    const state = this.options.getState();
    if (!runtimeGraph || !state || !this.hasSynchronizedNodes(runtimeGraph, state)) {
      return [];
    }
    return state.workspace.nodeIds.map((nodeId) => runtimeGraph.nodesMap[nodeId]);
  }

  public getEdges(): WorkspaceEdge[] {
    const runtimeGraph = this.options.getRuntimeGraph();
    const state = this.options.getState();
    if (!runtimeGraph || !state || !this.hasSynchronizedEdges(runtimeGraph, state)) {
      return [];
    }
    return state.workspace.edgeIds.map((edgeId) => runtimeGraph.edgesMap[edgeId]);
  }

  private hasSynchronizedNodes(runtimeGraph: RuntimeGraph, state: GraphState): boolean {
    return (
      runtimeGraph.nodes.length === state.workspace.nodeIds.length &&
      state.workspace.nodeIds.every((nodeId) => runtimeGraph.nodesMap[nodeId] !== undefined)
    );
  }

  private hasSynchronizedEdges(runtimeGraph: RuntimeGraph, state: GraphState): boolean {
    return (
      runtimeGraph.edges.length === state.workspace.edgeIds.length &&
      state.workspace.edgeIds.every((edgeId) => runtimeGraph.edgesMap[edgeId] !== undefined)
    );
  }
}
