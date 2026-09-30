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
}

export interface WorkspaceState {
  isInitialized: boolean;
  nodesById: Record<string, WorkspaceNodeState>;
  nodeIds: string[];
  edgesById: Record<string, WorkspaceEdgeState>;
  edgeIds: string[];
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
}

const initialWorkspaceState: WorkspaceState = {
  isInitialized: false,
  nodesById: {},
  nodeIds: [],
  edgesById: {},
  edgeIds: [],
  selectedNodeIds: [],
  selectedEdgeIds: [],
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
export const submitSearch = actionCreator<string>('SUBMIT_SEARCH');

export const workspaceReducer = reducerWithInitialState(initialWorkspaceState)
  .case(reset, () => initialWorkspaceState)
  .case(initializeWorkspace, (state) => ({ ...state, isInitialized: true }))
  .case(workspaceChanged, (_state, workspace) => workspace)
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
  const nodesById = Object.fromEntries(
    workspace.nodes.map((node) => [
      node.id,
      {
        id: node.id,
        parentId: node.parent?.id,
        x: node.x,
        y: node.y,
        label: node.label,
        color: node.color,
        data: node.data,
      },
    ])
  );
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
        },
      ];
    })
  );

  return {
    isInitialized: true,
    nodesById,
    nodeIds: workspace.nodes.map(({ id }) => id),
    edgesById,
    edgeIds: Object.keys(edgesById),
    selectedNodeIds: workspace.selectedNodes.map(({ id }) => id),
    selectedEdgeIds: workspace.getEdgeSelection().map(getEdgeId),
  };
};

const getEdgeId = ({ id, source, target }: Workspace['edges'][number]): string =>
  id ?? `${source.id}-${target.id}`;

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
