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
  workspaceGraphMergeStarted,
  workspacePositionsChanged,
} from './workspace';

export const createWorkspacePositionMiddleware = (
  getWorkspace: GraphStoreDependencies['getWorkspace']
): Middleware<object, GraphState, Dispatch<Action<string>>> => {
  const actionTypes = new Set([
    blocklistSelectedNodes.type,
    deleteSelectedNodes.type,
    groupSelectedNodes.type,
    mergeNodes.type,
    redoWorkspace.type,
    unblockAllNodes.type,
    unblockNode.type,
    undoWorkspace.type,
    ungroupNode.type,
    workspaceGraphMergeStarted.type,
  ]);
  return (store) => (next) => (action) => {
    if (isAction(action) && actionTypes.has(action.type)) {
      const workspace = getWorkspace();
      if (workspace) {
        // Capture positions before reducers record history; layout ticks stay outside Redux.
        store.dispatch(
          workspacePositionsChanged(workspace.nodes.map(({ id, x, y }) => ({ id, x, y })))
        );
      }
    }
    return next(action);
  };
};
