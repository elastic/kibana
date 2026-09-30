/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphState } from '../../state_management';
import type { Workspace, WorkspaceEdge, WorkspaceNode } from '../../types';

interface ReduxLayoutTopologyOptions {
  getState: () => GraphState | undefined;
  getWorkspace: () => Workspace | undefined;
}

/** Supplies mutable D3 objects in the normalized topology order owned by Redux. */
export class ReduxLayoutTopology {
  constructor(private readonly options: ReduxLayoutTopologyOptions) {}

  public getNodes(): WorkspaceNode[] {
    const workspace = this.options.getWorkspace();
    const state = this.options.getState();
    if (!workspace || !state || !this.hasSynchronizedNodes(workspace, state)) {
      return workspace?.nodes ?? [];
    }
    return state.workspace.nodeIds.map((nodeId) => workspace.nodesMap[nodeId]);
  }

  public getEdges(): WorkspaceEdge[] {
    const workspace = this.options.getWorkspace();
    const state = this.options.getState();
    if (!workspace || !state || !this.hasSynchronizedEdges(workspace, state)) {
      return workspace?.edges ?? [];
    }
    return state.workspace.edgeIds.map((edgeId) => workspace.edgesMap[edgeId]);
  }

  private hasSynchronizedNodes(workspace: Workspace, state: GraphState): boolean {
    return (
      workspace.nodes.length === state.workspace.nodeIds.length &&
      state.workspace.nodeIds.every((nodeId) => workspace.nodesMap[nodeId] !== undefined)
    );
  }

  private hasSynchronizedEdges(workspace: Workspace, state: GraphState): boolean {
    return (
      workspace.edges.length === state.workspace.edgeIds.length &&
      state.workspace.edgeIds.every((edgeId) => workspace.edgesMap[edgeId] !== undefined)
    );
  }
}
