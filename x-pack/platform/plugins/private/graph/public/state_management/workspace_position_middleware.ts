/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action, Dispatch, Middleware } from 'redux';
import { isAction } from '@reduxjs/toolkit';
import type { GraphState, GraphStoreDependencies } from './store';
import {
  blocklistSelectedNodes,
  deleteSelectedNodes,
  groupSelectedNodes,
  mergeNodes,
  redoWorkspace,
  unblockAllNodes,
  unblockNode,
  undoWorkspace,
  ungroupNode,
  workspaceGraphMerged,
  workspacePositionsChanged,
} from './workspace';

export const createWorkspacePositionMiddleware = (
  getRuntimeGraph: GraphStoreDependencies['getRuntimeGraph']
): Middleware<object, GraphState, Dispatch<Action<string>>> => {
  const positionSnapshotActionTypes = new Set([
    blocklistSelectedNodes.type,
    deleteSelectedNodes.type,
    groupSelectedNodes.type,
    mergeNodes.type,
    redoWorkspace.type,
    unblockAllNodes.type,
    unblockNode.type,
    undoWorkspace.type,
    ungroupNode.type,
    workspaceGraphMerged.type,
  ]);

  return (store) => (next) => (action) => {
    if (isAction(action) && positionSnapshotActionTypes.has(action.type)) {
      const runtimeGraph = getRuntimeGraph();
      if (runtimeGraph) {
        // Capture settled positions before the reducer records history or replaces topology.
        store.dispatch(
          workspacePositionsChanged(runtimeGraph.nodes.map(({ id, x, y }) => ({ id, x, y })))
        );
      }
    }
    return next(action);
  };
};
