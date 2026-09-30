/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import { i18n } from '@kbn/i18n';
import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { createSelector } from './create_selector';
import type { GraphStoreDependencies, GraphState, StartGraphListening } from '.';
import { fillWorkspace } from '.';
import { reset } from './global';
import { datasourceSelector } from './datasource';
import { liveResponseFieldsSelector, selectedFieldsSelector } from './fields';
import { fetchTopNodes } from '../services/fetch_top_nodes';
import type { Workspace, WorkspaceNode } from '../types';
import type { ServerResultNode } from '../types';
import type { MatchedAction } from './helpers';
import { matchesAction } from './helpers';

const actionCreator = actionCreatorFactory('x-pack/graph/workspace');

export interface WorkspaceNodeState {
  id: string;
  parentId?: string;
  x: number;
  y: number;
  label: string;
  color: string;
  scaledSize: number;
  data: WorkspaceNode['data'];
}

export interface WorkspaceEdgeState {
  id: string;
  sourceId: string;
  targetId: string;
  topSourceId: string;
  topTargetId: string;
  label: string;
  weight: number;
  width: number;
}

export interface WorkspaceSnapshot {
  isInitialized: boolean;
  isLayoutRunning: boolean;
  nodesById: Record<string, WorkspaceNodeState>;
  nodeIds: string[];
  edgesById: Record<string, WorkspaceEdgeState>;
  edgeIds: string[];
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  blocklistedNodesById: Record<string, WorkspaceNodeState>;
  blocklistedNodeIds: string[];
}

export interface WorkspaceState extends WorkspaceSnapshot {
  undoHistory: WorkspaceSnapshot[];
  redoHistory: WorkspaceSnapshot[];
}

const initialWorkspaceState: WorkspaceState = {
  isInitialized: false,
  isLayoutRunning: false,
  nodesById: {},
  nodeIds: [],
  edgesById: {},
  edgeIds: [],
  selectedNodeIds: [],
  selectedEdgeIds: [],
  blocklistedNodesById: {},
  blocklistedNodeIds: [],
  undoHistory: [],
  redoHistory: [],
};

export const initializeWorkspace = actionCreator('INITIALIZE_WORKSPACE');
export const workspaceChanged = actionCreator<WorkspaceState>('WORKSPACE_CHANGED');
export const selectAllNodes = actionCreator('SELECT_ALL_NODES');
export const clearNodeSelection = actionCreator('CLEAR_NODE_SELECTION');
export const invertNodeSelection = actionCreator('INVERT_NODE_SELECTION');
export const selectNeighborNodes = actionCreator('SELECT_NEIGHBOR_NODES');
export const toggleNodeSelection = actionCreator<{ nodeId: string; replace: boolean }>(
  'TOGGLE_NODE_SELECTION'
);
export const deselectNode = actionCreator<string>('DESELECT_NODE');
export const toggleEdgeSelection = actionCreator<string>('TOGGLE_EDGE_SELECTION');
export const deleteSelectedNodes = actionCreator('DELETE_SELECTED_NODES');
export const blocklistSelectedNodes = actionCreator('BLOCKLIST_SELECTED_NODES');
export const groupSelectedNodes = actionCreator<string>('GROUP_SELECTED_NODES');
export const ungroupNode = actionCreator<string>('UNGROUP_NODE');
export const unblockNode = actionCreator<string>('UNBLOCK_NODE');
export const unblockAllNodes = actionCreator('UNBLOCK_ALL_NODES');
export const undoWorkspace = actionCreator('UNDO_WORKSPACE');
export const redoWorkspace = actionCreator('REDO_WORKSPACE');
export const setNodeLabel = actionCreator<{ nodeId: string; label: string }>('SET_NODE_LABEL');
export const colorSelectedNodes = actionCreator<string>('COLOR_SELECTED_NODES');
export const startWorkspaceLayout = actionCreator('START_WORKSPACE_LAYOUT');
export const stopWorkspaceLayout = actionCreator('STOP_WORKSPACE_LAYOUT');
export const submitSearch = actionCreator<string>('SUBMIT_SEARCH');

export const workspaceReducer = reducerWithInitialState(initialWorkspaceState)
  .case(reset, () => initialWorkspaceState)
  .case(initializeWorkspace, (state) => ({ ...state, isInitialized: true }))
  .case(workspaceChanged, (state, workspace) => ({
    ...workspace,
    undoHistory: state.undoHistory,
    redoHistory: state.redoHistory,
  }))
  .case(selectAllNodes, (state) => ({
    ...state,
    selectedNodeIds: state.nodeIds.filter((id) => state.nodesById[id].parentId === undefined),
  }))
  .case(clearNodeSelection, (state) => ({ ...state, selectedNodeIds: [] }))
  .case(invertNodeSelection, (state) => {
    const selectedNodeIds = new Set(state.selectedNodeIds);
    return {
      ...state,
      selectedNodeIds: state.nodeIds.filter(
        (id) => state.nodesById[id].parentId === undefined && !selectedNodeIds.has(id)
      ),
    };
  })
  .case(selectNeighborNodes, (state) => ({
    ...state,
    selectedNodeIds: selectNodesAndNeighbors(state),
  }))
  .case(toggleNodeSelection, (state, { nodeId, replace }) => ({
    ...state,
    selectedNodeIds: toggleSelectedId(state.selectedNodeIds, nodeId, replace),
  }))
  .case(deselectNode, (state, nodeId) => ({
    ...state,
    selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
  }))
  .case(toggleEdgeSelection, (state, edgeId) => ({
    ...state,
    selectedEdgeIds: state.selectedEdgeIds.includes(edgeId) ? [] : [edgeId],
  }))
  .case(deleteSelectedNodes, (state) =>
    recordUndo(state, removeNodes(state, getSelectedNodeIds(state)))
  )
  .case(blocklistSelectedNodes, (state) => {
    const nodeIds = getSelectedNodeIds(state, false);
    const blocklistedNodesById = { ...state.blocklistedNodesById };
    for (const nodeId of nodeIds) {
      blocklistedNodesById[nodeId] = state.nodesById[nodeId];
    }
    return {
      ...removeNodes(state, nodeIds),
      blocklistedNodesById,
      blocklistedNodeIds: [...state.blocklistedNodeIds, ...nodeIds],
    };
  })
  .case(groupSelectedNodes, (state, parentId) => {
    if (!state.nodesById[parentId]) {
      return state;
    }
    return recordUndo(state, {
      ...state,
      nodesById: Object.fromEntries(
        Object.entries(state.nodesById).map(([nodeId, node]) => [
          nodeId,
          state.selectedNodeIds.includes(nodeId) &&
          nodeId !== parentId &&
          node.parentId === undefined
            ? { ...node, parentId }
            : node,
        ])
      ),
      selectedNodeIds: [parentId],
    });
  })
  .case(ungroupNode, (state, parentId) =>
    recordUndo(state, {
      ...state,
      nodesById: Object.fromEntries(
        Object.entries(state.nodesById).map(([nodeId, node]) => [
          nodeId,
          node.parentId === parentId ? { ...node, parentId: undefined } : node,
        ])
      ),
    })
  )
  .case(unblockNode, (state, nodeId) => {
    const blocklistedNodesById = { ...state.blocklistedNodesById };
    delete blocklistedNodesById[nodeId];
    return {
      ...state,
      blocklistedNodesById,
      blocklistedNodeIds: state.blocklistedNodeIds.filter((id) => id !== nodeId),
    };
  })
  .case(unblockAllNodes, (state) => ({
    ...state,
    blocklistedNodesById: {},
    blocklistedNodeIds: [],
  }))
  .case(undoWorkspace, (state) => applyUndo(state))
  .case(redoWorkspace, (state) => applyRedo(state))
  .case(setNodeLabel, (state, { nodeId, label }) => {
    const node = state.nodesById[nodeId];
    if (!node) {
      return state;
    }
    return {
      ...state,
      nodesById: {
        ...state.nodesById,
        [nodeId]: { ...node, label },
      },
    };
  })
  .case(colorSelectedNodes, (state, color) => ({
    ...state,
    nodesById: Object.fromEntries(
      Object.entries(state.nodesById).map(([nodeId, node]) => [
        nodeId,
        state.selectedNodeIds.includes(nodeId) ? { ...node, color } : node,
      ])
    ),
  }))
  .case(startWorkspaceLayout, (state) => ({ ...state, isLayoutRunning: true }))
  .case(stopWorkspaceLayout, (state) => ({ ...state, isLayoutRunning: false }))
  .build();

export const workspaceSelector = (state: GraphState) => state.workspace;
export const workspaceInitializedSelector = createSelector(
  workspaceSelector,
  (workspace: WorkspaceState) => workspace.isInitialized
);

export const selectedNodeIdsSelector = createSelector(
  workspaceSelector,
  (workspace: WorkspaceState) => workspace.selectedNodeIds
);

const toSnapshot = ({ undoHistory, redoHistory, ...snapshot }: WorkspaceState): WorkspaceSnapshot =>
  snapshot;

const recordUndo = (state: WorkspaceState, nextState: WorkspaceState): WorkspaceState => ({
  ...nextState,
  undoHistory: [...state.undoHistory, toSnapshot(state)].slice(-50),
  redoHistory: [],
});

const applyUndo = (state: WorkspaceState): WorkspaceState => {
  const previous = state.undoHistory[state.undoHistory.length - 1];
  if (!previous) {
    return state;
  }
  return {
    ...previous,
    undoHistory: state.undoHistory.slice(0, -1),
    redoHistory: [...state.redoHistory, toSnapshot(state)].slice(-50),
  };
};

const applyRedo = (state: WorkspaceState): WorkspaceState => {
  const next = state.redoHistory[state.redoHistory.length - 1];
  if (!next) {
    return state;
  }
  return {
    ...next,
    undoHistory: [...state.undoHistory, toSnapshot(state)].slice(-50),
    redoHistory: state.redoHistory.slice(0, -1),
  };
};

const getSelectedNodeIds = (state: WorkspaceState, defaultToAll = true): string[] => {
  const selectedNodeIds = state.selectedNodeIds.length
    ? new Set(state.selectedNodeIds)
    : new Set(defaultToAll ? state.nodeIds : []);

  for (const nodeId of state.nodeIds) {
    let parentId = state.nodesById[nodeId].parentId;
    while (parentId) {
      if (selectedNodeIds.has(parentId)) {
        selectedNodeIds.add(nodeId);
        break;
      }
      parentId = state.nodesById[parentId]?.parentId;
    }
  }
  return state.nodeIds.filter((nodeId) => selectedNodeIds.has(nodeId));
};

const removeNodes = (state: WorkspaceState, nodeIds: string[]): WorkspaceState => {
  const removedNodeIds = new Set(nodeIds);
  const nodesById = Object.fromEntries(
    Object.entries(state.nodesById).filter(([nodeId]) => !removedNodeIds.has(nodeId))
  );
  const edgesById = Object.fromEntries(
    Object.entries(state.edgesById).filter(
      ([, edge]) => !removedNodeIds.has(edge.sourceId) && !removedNodeIds.has(edge.targetId)
    )
  );

  return {
    ...state,
    nodesById,
    nodeIds: state.nodeIds.filter((nodeId) => !removedNodeIds.has(nodeId)),
    edgesById,
    edgeIds: state.edgeIds.filter((edgeId) => edgesById[edgeId] !== undefined),
    selectedNodeIds: [],
    selectedEdgeIds: state.selectedEdgeIds.filter((edgeId) => edgesById[edgeId] !== undefined),
  };
};

const toggleSelectedId = (selectedIds: string[], id: string, replace: boolean): string[] => {
  const isSelected = selectedIds.includes(id);
  if (replace) {
    return isSelected && selectedIds.length === 1 ? [] : [id];
  }
  return isSelected ? selectedIds.filter((selectedId) => selectedId !== id) : [...selectedIds, id];
};

const selectNodesAndNeighbors = (state: WorkspaceState): string[] => {
  const originallySelectedNodeIds = new Set(state.selectedNodeIds);
  const selectedNodeIds = new Set(state.selectedNodeIds);
  for (const edgeId of state.edgeIds) {
    const edge = state.edgesById[edgeId];
    if (originallySelectedNodeIds.has(edge.topSourceId)) {
      selectedNodeIds.add(edge.topTargetId);
    }
    if (originallySelectedNodeIds.has(edge.topTargetId)) {
      selectedNodeIds.add(edge.topSourceId);
    }
  }
  return state.nodeIds.filter((id) => selectedNodeIds.has(id));
};

export const createWorkspaceState = (workspace: Workspace): WorkspaceState => {
  const nodesById = Object.fromEntries(workspace.nodes.map((node) => [node.id, toNodeState(node)]));
  const blocklistedNodes = (workspace.blocklistedNodes ?? []) as WorkspaceNode[];
  const edgesById = Object.fromEntries(
    workspace.edges.map((edge) => {
      const id = getEdgeId(edge);
      return [
        id,
        {
          id,
          sourceId: edge.source.id,
          targetId: edge.target.id,
          topSourceId: edge.topSrc.id,
          topTargetId: edge.topTarget.id,
          label: edge.label,
          weight: edge.weight,
          width: edge.width,
        },
      ];
    })
  );

  return {
    isInitialized: true,
    isLayoutRunning: Boolean(workspace.isLayoutRunning?.()),
    nodesById,
    nodeIds: workspace.nodes.map(({ id }) => id),
    edgesById,
    edgeIds: Object.keys(edgesById),
    selectedNodeIds: workspace.selectedNodes.map(({ id }) => id),
    selectedEdgeIds: workspace.getEdgeSelection().map(getEdgeId),
    blocklistedNodesById: Object.fromEntries(
      blocklistedNodes.map((node) => [node.id, toNodeState(node)])
    ),
    blocklistedNodeIds: blocklistedNodes.map(({ id }) => id),
    undoHistory: [],
    redoHistory: [],
  };
};

const toNodeState = (node: WorkspaceNode): WorkspaceNodeState => ({
  id: node.id,
  parentId: node.parent?.id,
  x: node.x,
  y: node.y,
  label: node.label,
  color: node.color,
  scaledSize: node.scaledSize,
  data: node.data,
});

const getEdgeId = ({ id, source, target }: Workspace['edges'][number]): string =>
  id ?? `${source.id}-${target.id}`;

const layoutActionTypes = new Set([startWorkspaceLayout.type, stopWorkspaceLayout.type]);

const presentationActionTypes = new Set([setNodeLabel.type, colorSelectedNodes.type]);

const topologyActionTypes = new Set([
  deleteSelectedNodes.type,
  blocklistSelectedNodes.type,
  groupSelectedNodes.type,
  ungroupNode.type,
  unblockNode.type,
  unblockAllNodes.type,
  undoWorkspace.type,
  redoWorkspace.type,
]);

const selectionActionTypes = new Set([
  selectAllNodes.type,
  clearNodeSelection.type,
  invertNodeSelection.type,
  selectNeighborNodes.type,
  toggleNodeSelection.type,
  deselectNode.type,
  toggleEdgeSelection.type,
]);

const synchronizeWorkspaceSelection = (workspace: Workspace, state: WorkspaceState): void => {
  const selectedNodeIds = new Set(state.selectedNodeIds);
  workspace.selectedNodes = workspace.nodes.filter((node) => {
    node.isSelected = selectedNodeIds.has(node.id);
    return node.isSelected;
  });

  const selectedEdgeIds = new Set(state.selectedEdgeIds);
  workspace.clearEdgeSelection();
  workspace.edges.forEach((edge) => {
    if (selectedEdgeIds.has(getEdgeId(edge))) {
      workspace.addEdgeToSelection(edge);
    }
  });
};

/**
 * Listener handling filling in top terms into workspace.
 *
 * It will load the top terms of the selected fields, add them to the workspace and fill in the connections.
 */
export const registerWorkspaceListeners = (
  startListening: StartGraphListening,
  { getWorkspace, notifyReact, http, notifications, handleSearchQueryError }: GraphStoreDependencies
) => {
  startListening({
    predicate: (action) => selectionActionTypes.has(action.type),
    effect: (_action, listenerApi) => {
      const workspace = getWorkspace();
      if (!workspace) {
        return;
      }

      synchronizeWorkspaceSelection(workspace, listenerApi.getState().workspace);
      notifyReact();
    },
  });

  startListening({
    predicate: (action) => layoutActionTypes.has(action.type),
    effect: (action) => {
      const workspace = getWorkspace();
      if (!workspace) {
        return;
      }

      if (startWorkspaceLayout.match(action)) {
        workspace.runLayout();
      } else {
        workspace.stopLayout();
        notifyReact();
      }
    },
  });

  startListening({
    predicate: (action) => presentationActionTypes.has(action.type),
    effect: (action) => {
      const workspace = getWorkspace();
      if (!workspace) {
        return;
      }

      if (setNodeLabel.match(action)) {
        const node = workspace.nodesMap[action.payload.nodeId];
        if (node) {
          node.label = action.payload.label;
        }
      } else if (colorSelectedNodes.match(action)) {
        workspace.colorSelected(action.payload);
      }
      notifyReact();
    },
  });

  startListening({
    predicate: (action) => topologyActionTypes.has(action.type),
    effect: (action) => {
      const workspace = getWorkspace();
      if (!workspace) {
        return;
      }

      if (deleteSelectedNodes.match(action)) {
        workspace.deleteSelection();
      } else if (blocklistSelectedNodes.match(action)) {
        workspace.blocklistSelection();
      } else if (groupSelectedNodes.match(action)) {
        workspace.groupSelections(workspace.nodesMap[action.payload]);
      } else if (ungroupNode.match(action)) {
        workspace.ungroup(workspace.nodesMap[action.payload]);
      } else if (unblockNode.match(action)) {
        const blockedNode = (workspace.blocklistedNodes as WorkspaceNode[]).find(
          ({ id }) => id === action.payload
        );
        if (blockedNode) {
          workspace.unblockNode(blockedNode);
        }
      } else if (unblockAllNodes.match(action)) {
        workspace.unblockAll();
      } else if (undoWorkspace.match(action)) {
        workspace.undo();
      } else if (redoWorkspace.match(action)) {
        workspace.redo();
      }
      notifyReact();
    },
  });

  startListening({
    predicate: fillWorkspace.match,
    effect: async (_action, listenerApi) => {
      listenerApi.cancelActiveListeners();
      const workspace = getWorkspace();
      if (!workspace) {
        return;
      }

      const fields = selectedFieldsSelector(listenerApi.getState());
      const datasource = datasourceSelector(listenerApi.getState()).current;
      if (datasource.type === 'none') {
        return;
      }

      try {
        const topTermNodes: ServerResultNode[] = await fetchTopNodes(
          http.post,
          datasource.title,
          fields
        );
        listenerApi.throwIfCancelled();
        workspace.mergeGraph({ nodes: topTermNodes, edges: [] });
        listenerApi.dispatch(initializeWorkspace());
        notifyReact();
        workspace.fillInGraph(fields.length * 10);
      } catch (error) {
        if (listenerApi.signal.aborted) {
          return;
        }
        const message = getErrorMessage(error);
        notifications.toasts.addDanger({
          title: i18n.translate('xpack.graph.fillWorkspaceError', {
            defaultMessage: 'Fetching top terms failed: {message}',
            values: { message },
          }),
        });
      }
    },
  });

  startListening({
    matcher: matchesAction(submitSearch),
    effect: (action: MatchedAction<string>, listenerApi) => {
      listenerApi.cancelActiveListeners();
      listenerApi.dispatch(initializeWorkspace());

      // type casting is safe, at this point workspace should be loaded
      const workspace = getWorkspace() as Workspace;
      const liveResponseFields = liveResponseFieldsSelector(listenerApi.getState());
      const numHops = 2;

      if (!action.payload.startsWith('{')) {
        workspace.simpleSearch(action.payload, liveResponseFields, numHops);
        return;
      }

      try {
        const query = JSON.parse(action.payload);
        if (query.vertices) {
          // Is a graph explore request
          workspace.callElasticsearch(query);
        } else {
          // Is a regular query DSL query
          workspace.search(query, liveResponseFields, numHops);
        }
      } catch (error) {
        handleSearchQueryError(error as Error);
      }
    },
  });
};

const getErrorMessage = (error: unknown): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'body' in error &&
    typeof error.body === 'object' &&
    error.body !== null &&
    'message' in error.body &&
    typeof error.body.message === 'string'
  ) {
    return error.body.message;
  }

  return error instanceof Error ? error.message : String(error);
};
