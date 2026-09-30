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
import { makeEdgeId, makeNodeId } from '../services/workspace/graph_merge_planner';
import {
  buildExpandExploreRequest,
  buildFillConnectionsRequest,
  buildNodeQuery,
  buildSearchExploreRequest,
} from '../services/workspace/graph_request_builders';
import {
  limitNodesForConnectionSearch,
  transformFillConnectionsResponse,
} from '../services/workspace/fill_connections';
import {
  transformExpandResponse,
  transformSearchResponse,
} from '../services/workspace/graph_response_transformers';
import { syncRuntimeTopology } from '../services/workspace/sync_runtime_topology';
import type { GraphData, Workspace, WorkspaceField, WorkspaceNode } from '../types';
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
  icon?: WorkspaceNode['icon'];
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
  docCount?: number;
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
export const workspaceRuntimeChanged = actionCreator<WorkspaceState>('WORKSPACE_RUNTIME_CHANGED');
export const workspaceGraphMerged = actionCreator<GraphData>('WORKSPACE_GRAPH_MERGED');
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
export const mergeNodes = actionCreator<{ parentId: string; childId: string }>('MERGE_NODES');
export const unblockNode = actionCreator<string>('UNBLOCK_NODE');
export const unblockAllNodes = actionCreator('UNBLOCK_ALL_NODES');
export const undoWorkspace = actionCreator('UNDO_WORKSPACE');
export const redoWorkspace = actionCreator('REDO_WORKSPACE');
export const setNodeLabel = actionCreator<{ nodeId: string; label: string }>('SET_NODE_LABEL');
export const colorSelectedNodes = actionCreator<string>('COLOR_SELECTED_NODES');
export const startWorkspaceLayout = actionCreator('START_WORKSPACE_LAYOUT');
export const stopWorkspaceLayout = actionCreator('STOP_WORKSPACE_LAYOUT');
export const expandSelectedNodes = actionCreator<WorkspaceField[]>('EXPAND_SELECTED_NODES');
export const fillWorkspaceConnections = actionCreator<number | undefined>(
  'FILL_WORKSPACE_CONNECTIONS'
);
export const submitSearch = actionCreator<string>('SUBMIT_SEARCH');

export const workspaceReducer = reducerWithInitialState(initialWorkspaceState)
  .case(reset, () => initialWorkspaceState)
  .case(initializeWorkspace, (state) => ({ ...state, isInitialized: true }))
  .case(workspaceChanged, (_state, workspace) => workspace)
  .case(workspaceRuntimeChanged, (state, workspace) => ({
    ...workspace,
    selectedNodeIds: state.selectedNodeIds,
    selectedEdgeIds: state.selectedEdgeIds,
    undoHistory: state.undoHistory,
    redoHistory: state.redoHistory,
  }))
  .case(workspaceGraphMerged, (state, graph) => {
    const nodesById = { ...state.nodesById };
    const nodeIds = [...state.nodeIds];
    const edgesById = { ...state.edgesById };
    const edgeIds = [...state.edgeIds];

    graph.nodes.forEach((node) => {
      const id = makeNodeId(node.field, node.term);
      if (nodesById[id]) return;
      nodesById[id] = {
        id,
        x: 1,
        y: 1,
        label: node.label ?? node.term,
        color: node.color ?? '#000000',
        scaledSize: 15,
        data: { field: node.field, term: node.term },
        icon: node.icon,
      };
      nodeIds.push(id);
    });

    graph.edges.forEach((edge) => {
      const source = graph.nodes[edge.source];
      const target = graph.nodes[edge.target];
      const sourceId = makeNodeId(source.field, source.term);
      const targetId = makeNodeId(target.field, target.term);
      const id = makeEdgeId(sourceId, targetId);
      const existingEdge = edgesById[id];
      if (existingEdge) {
        edgesById[id] = { ...existingEdge, weight: Math.max(existingEdge.weight, edge.weight) };
        return;
      }
      edgesById[id] = {
        id,
        sourceId,
        targetId,
        topSourceId: sourceId,
        topTargetId: targetId,
        label: '',
        weight: edge.weight,
        width: edge.width,
        docCount: edge.doc_count,
      };
      edgeIds.push(id);
    });

    return recordUndo(state, { ...state, nodesById, nodeIds, edgesById, edgeIds });
  })
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
  .case(mergeNodes, (state, { parentId, childId }) => {
    const child = state.nodesById[childId];
    if (!state.nodesById[parentId] || !child) {
      return state;
    }
    return recordUndo(state, {
      ...state,
      nodesById: { ...state.nodesById, [childId]: { ...child, parentId } },
      selectedNodeIds: state.selectedNodeIds.filter((nodeId) => nodeId !== childId),
    });
  })
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
          topSourceId: edge.topSrc?.id ?? edge.source.id,
          topTargetId: edge.topTarget?.id ?? edge.target.id,
          label: edge.label,
          weight: edge.weight,
          width: edge.width,
          docCount: edge.doc_count,
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
    selectedNodeIds: [],
    selectedEdgeIds: [],
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
  icon: node.icon,
});

const getEdgeId = ({ id, source, target }: Workspace['edges'][number]): string =>
  id ?? `${source.id}-${target.id}`;

const requestActionTypes = new Set([expandSelectedNodes.type, fillWorkspaceConnections.type]);

const layoutActionTypes = new Set([startWorkspaceLayout.type, stopWorkspaceLayout.type]);

const presentationActionTypes = new Set([setNodeLabel.type, colorSelectedNodes.type]);

const topologyActionTypes = new Set([
  deleteSelectedNodes.type,
  blocklistSelectedNodes.type,
  groupSelectedNodes.type,
  ungroupNode.type,
  mergeNodes.type,
  unblockNode.type,
  unblockAllNodes.type,
  undoWorkspace.type,
  redoWorkspace.type,
]);

/**
 * Listener handling filling in top terms into workspace.
 *
 * It will load the top terms of the selected fields, add them to the workspace and fill in the connections.
 */
export const registerWorkspaceListeners = (
  startListening: StartGraphListening,
  {
    getWorkspace,
    notifyReact,
    http,
    notifications,
    handleSearchQueryError,
    exploreGraph,
    searchGraph,
  }: GraphStoreDependencies
) => {
  startListening({
    predicate: (action) => requestActionTypes.has(action.type),
    effect: async (action, listenerApi) => {
      const workspace = getWorkspace();
      if (!workspace) {
        return;
      }

      if (expandSelectedNodes.match(action)) {
        listenerApi.cancelActiveListeners();
        const { exploreControls, indexName, vertex_fields: vertexFields } = workspace.options;
        if (!exploreControls || !indexName || !vertexFields) return;
        const selectedNodes = listenerApi
          .getState()
          .workspace.selectedNodeIds.map((id) => workspace.nodesMap[id])
          .filter((node) => node !== undefined);
        const startNodes =
          selectedNodes.length > 0
            ? workspace.returnUnpackedGroupeds(selectedNodes)
            : workspace.nodes;
        const request = buildExpandExploreRequest({
          startNodes,
          existingNodes: workspace.nodes,
          blocklistedNodes: workspace.blocklistedNodes,
          fields: vertexFields,
          targetFields: action.payload,
          settings: exploreControls,
        });
        try {
          const response = await exploreGraph(indexName, request);
          listenerApi.throwIfCancelled();
          const graph = transformExpandResponse(response, action.payload);
          listenerApi.dispatch(workspaceGraphMerged(graph));
          workspace.mergeGraph(graph);
        } catch (error) {
          if (!listenerApi.signal.aborted) {
            handleSearchQueryError(error as Error);
          }
        }
      } else if (fillWorkspaceConnections.match(action)) {
        listenerApi.cancelActiveListeners();
        const { exploreControls, indexName } = workspace.options;
        if (!exploreControls || !indexName) return;
        const selectedNodes = listenerApi
          .getState()
          .workspace.selectedNodeIds.map((id) => workspace.nodesMap[id])
          .filter((node) => node !== undefined);
        const unpackedNodes =
          selectedNodes.length > 0
            ? workspace.returnUnpackedGroupeds(selectedNodes)
            : workspace.nodes;
        const nodes = limitNodesForConnectionSearch(
          unpackedNodes.filter((node) => node.parent === undefined)
        );
        const request = buildFillConnectionsRequest(
          nodes.map((node) => buildNodeQuery(workspace.returnUnpackedGroupeds([node])))
        );
        try {
          const response = await searchGraph(indexName, request);
          listenerApi.throwIfCancelled();
          const { graph, existingEdgeDocCounts } = transformFillConnectionsResponse({
            response,
            nodes,
            existingEdgeIds: new Set(Object.keys(workspace.edgesMap)),
            useSignificance: exploreControls.useSignificance,
            minDocCount: exploreControls.minDocCount,
            maxNewEdges: action.payload ?? 10,
          });
          Object.entries(existingEdgeDocCounts).forEach(([id, docCount]) => {
            const edge = workspace.edgesMap[id];
            edge.doc_count = Math.max(edge.doc_count ?? 0, docCount);
          });
          listenerApi.dispatch(workspaceGraphMerged(graph));
          workspace.mergeGraph(graph);
        } catch (error) {
          if (!listenerApi.signal.aborted) {
            handleSearchQueryError(error as Error);
          }
        }
      }
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
    effect: (action, listenerApi) => {
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
        const { selectedNodeIds } = listenerApi.getState().workspace;
        selectedNodeIds.forEach((nodeId) => {
          const node = workspace.nodesMap[nodeId];
          if (node) {
            node.color = action.payload;
          }
        });
      }
      notifyReact();
    },
  });

  startListening({
    predicate: (action) => topologyActionTypes.has(action.type),
    effect: (_action, listenerApi) => {
      const workspace = getWorkspace();
      if (!workspace) {
        return;
      }

      syncRuntimeTopology(workspace, listenerApi.getState().workspace);
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
        listenerApi.dispatch(fillWorkspaceConnections(fields.length * 10));
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
    effect: async (action: MatchedAction<string>, listenerApi) => {
      listenerApi.cancelActiveListeners();
      listenerApi.dispatch(initializeWorkspace());

      // type casting is safe, at this point workspace should be loaded
      const workspace = getWorkspace() as Workspace;
      const liveResponseFields = liveResponseFieldsSelector(listenerApi.getState());
      const numHops = 2;
      const { exploreControls, indexName, vertex_fields: vertexFields } = workspace.options;
      if (!exploreControls || !indexName || !vertexFields) return;

      try {
        let request;
        if (!action.payload.startsWith('{')) {
          request = buildSearchExploreRequest({
            query: { query_string: { query: action.payload } },
            fields: liveResponseFields,
            numHops,
            blocklistedNodes: workspace.blocklistedNodes,
            settings: exploreControls,
          });
        } else {
          const query = JSON.parse(action.payload);
          request = query.vertices
            ? query
            : buildSearchExploreRequest({
                query,
                fields: liveResponseFields,
                numHops,
                blocklistedNodes: workspace.blocklistedNodes,
                settings: exploreControls,
              });
        }

        const response = await exploreGraph(indexName, request);
        listenerApi.throwIfCancelled();
        const graph = transformSearchResponse(response, vertexFields);
        listenerApi.dispatch(workspaceGraphMerged(graph));
        workspace.mergeGraph(graph);
      } catch (error) {
        if (listenerApi.signal.aborted) return;
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
