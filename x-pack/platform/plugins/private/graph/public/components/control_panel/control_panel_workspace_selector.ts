/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphState, WorkspaceState } from '../../state_management';

export type ControlPanelWorkspace = Pick<
  WorkspaceState,
  'nodeIds' | 'nodesById' | 'selectedNodeIds'
>;

export const controlPanelWorkspaceSelector = ({ workspace }: GraphState): ControlPanelWorkspace =>
  workspace;

const haveSameIds = (previousIds: string[], nextIds: string[]): boolean =>
  previousIds.length === nextIds.length &&
  previousIds.every((previousId, index) => previousId === nextIds[index]);

export const areControlPanelWorkspacesEqual = (
  previous: ControlPanelWorkspace,
  next: ControlPanelWorkspace
): boolean => {
  if (
    !haveSameIds(previous.nodeIds, next.nodeIds) ||
    !haveSameIds(previous.selectedNodeIds, next.selectedNodeIds)
  ) {
    return false;
  }

  for (const nodeId of next.nodeIds) {
    if (previous.nodesById[nodeId]?.parentId !== next.nodesById[nodeId]?.parentId) {
      return false;
    }
  }

  return next.selectedNodeIds.every((nodeId) => {
    const previousNode = previous.nodesById[nodeId];
    const nextNode = next.nodesById[nodeId];
    return (
      previousNode?.label === nextNode?.label &&
      previousNode?.color === nextNode?.color &&
      previousNode?.icon === nextNode?.icon &&
      previousNode?.data === nextNode?.data
    );
  });
};
