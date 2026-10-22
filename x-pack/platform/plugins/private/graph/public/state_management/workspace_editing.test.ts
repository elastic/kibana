/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWorkspace } from '../services/workspace/graph_client_workspace';
import { getIcon } from '../helpers/style_choices';
import { datasourceLoaded } from './datasource';
import { createMockGraphStore } from './mocks';
import { createGraphStore, type GraphStore } from './store';
import {
  blocklistSelectedNodes,
  clearNodeSelection,
  colorSelectedNodes,
  createWorkspaceState,
  deleteSelectedNodes,
  groupSelectedNodes,
  mergeNodes,
  redoWorkspace,
  selectNeighborNodes,
  setNodeLabel,
  toggleEdgeSelection,
  toggleNodeSelection,
  unblockAllNodes,
  unblockNode,
  undoWorkspace,
  ungroupNode,
  workspaceGraphMergeStarted,
  workspaceGraphMerged,
  workspaceLoaded,
  workspaceRuntimeChanged,
} from './workspace';

const createEnvironment = () => {
  const workspace = createWorkspace({
    graphMergeStarted: () => store.dispatch(workspaceGraphMergeStarted()),
    topologyChangeHandler: () =>
      store.dispatch(workspaceGraphMerged(createWorkspaceState(workspace))),
  });
  const { mockedDeps } = createMockGraphStore({});
  mockedDeps.getWorkspace.mockReturnValue(workspace);
  mockedDeps.notifyReact.mockImplementation(() =>
    store.dispatch(workspaceRuntimeChanged(createWorkspaceState(workspace)))
  );
  const store: GraphStore = createGraphStore(mockedDeps);
  const graph = {
    nodes: ['first', 'second', 'third'].map((term) => ({
      id: '',
      field: 'field',
      term,
      label: term,
      color: 'blue',
      icon: getIcon('folder'),
      data: { field: 'field', term },
    })),
    edges: [{ source: 0, target: 1, weight: 5, width: 3, doc_count: 7 }],
  };
  workspace.mergeGraph(graph);
  workspace.stopLayout();
  store.dispatch(workspaceLoaded(createWorkspaceState(workspace)));
  workspace.nodesMap['field..first'].x = 10;
  workspace.nodesMap['field..first'].y = 20;
  workspace.nodesMap['field..second'].x = 30;
  workspace.nodesMap['field..second'].y = 40;
  return { store, workspace, graph, mockedDeps };
};

describe('workspace editing', () => {
  const environments: Array<ReturnType<typeof createEnvironment>> = [];
  const setup = () => {
    const environment = createEnvironment();
    environments.push(environment);
    return environment;
  };
  afterEach(() => {
    environments.forEach(({ workspace }) => workspace.stopLayout());
    environments.length = 0;
  });

  it('preserves presentation, coordinates and surviving node identities through deletion and undo/redo', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));
    store.dispatch(toggleEdgeSelection(store.getState().workspace.edgeIds[0]));
    const originalIcon = workspace.nodesMap['field..first'].icon;
    const remainingNode = workspace.nodesMap['field..second'];
    store.dispatch(setNodeLabel({ nodeId: 'field..first', label: 'Custom label' }));
    store.dispatch(colorSelectedNodes('red'));
    store.dispatch(deleteSelectedNodes());
    expect(workspace.nodesMap['field..first']).toBeUndefined();
    expect(workspace.edges).toHaveLength(0);
    expect(workspace.nodesMap['field..second']).toBe(remainingNode);
    expect(remainingNode).toMatchObject({ x: 30, y: 40 });
    expect(store.getState().workspace.undoHistory).toHaveLength(1);

    remainingNode.x = 50;
    store.dispatch(undoWorkspace());
    expect(workspace.nodesMap['field..first']).toMatchObject({
      x: 10,
      y: 20,
      label: 'Custom label',
      color: 'red',
      icon: originalIcon,
    });
    expect(workspace.selectedNodes.map(({ id }) => id)).toEqual(['field..first']);
    expect(workspace.getEdgeSelection()).toHaveLength(1);
    expect(workspace.edges[0]).toMatchObject({ weight: 5, width: 3, doc_count: 7 });
    store.dispatch(redoWorkspace());
    expect(workspace.nodesMap['field..second'].x).toBe(50);
    for (const property of ['deleteSelection', 'undo', 'redo', 'undoLog', 'redoLog']) {
      expect(workspace).not.toHaveProperty(property);
    }
    expect(JSON.parse(JSON.stringify(store.getState().workspace))).toEqual(
      store.getState().workspace
    );
  });

  it('removes a selected group, its descendants and dangling edges from Redux and the runtime', () => {
    const { store, workspace } = setup();
    store.dispatch(mergeNodes({ parentId: 'field..third', childId: 'field..second' }));
    store.dispatch(toggleNodeSelection({ nodeId: 'field..third', replace: true }));

    expect(workspace.nodesMap['field..second'].parent?.id).toBe('field..third');
    expect(workspace.edges).toHaveLength(1);
    expect(store.getState().workspace.edgeIds).toHaveLength(1);

    store.dispatch(deleteSelectedNodes());

    const { nodeIds, nodesById, edgeIds, edgesById } = store.getState().workspace;
    expect(nodeIds).toEqual(['field..first']);
    expect(Object.keys(nodesById)).toEqual(['field..first']);
    expect(edgeIds).toEqual([]);
    expect(edgesById).toEqual({});
    expect(workspace.nodes.map(({ id }) => id)).toEqual(['field..first']);
    expect(workspace.nodesMap['field..second']).toBeUndefined();
    expect(workspace.nodesMap['field..third']).toBeUndefined();
    expect(workspace.edges).toEqual([]);
  });

  it('projects grouping, merging and ungrouping, including visible edge endpoints', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..second', replace: true }));
    store.dispatch(toggleNodeSelection({ nodeId: 'field..third', replace: false }));
    store.dispatch(groupSelectedNodes('field..third'));
    expect(workspace.nodesMap['field..second'].parent?.id).toBe('field..third');
    expect(workspace.edges[0].topTarget.id).toBe('field..third');
    store.dispatch(selectNeighborNodes());
    expect(store.getState().workspace.selectedNodeIds).toContain('field..first');
    store.dispatch(ungroupNode('field..third'));
    expect(workspace.nodesMap['field..second'].parent).toBeUndefined();
    store.dispatch(mergeNodes({ parentId: 'field..first', childId: 'field..second' }));
    expect(workspace.nodesMap['field..second'].parent?.id).toBe('field..first');
    store.dispatch(undoWorkspace());
    expect(workspace.nodesMap['field..second'].parent).toBeUndefined();
  });

  it('preserves grouped styling for descendants without styling unselected nodes', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..second', replace: true }));
    store.dispatch(groupSelectedNodes('field..third'));
    store.dispatch(colorSelectedNodes('green'));
    expect(workspace.nodesMap['field..second'].color).toBe('green');
    expect(workspace.nodesMap['field..third'].color).toBe('green');
    expect(store.getState().workspace.nodesById['field..second'].color).toBe('green');
    expect(workspace.nodesMap['field..first'].color).toBe('blue');
    store.dispatch(clearNodeSelection());
    store.dispatch(colorSelectedNodes('red'));
    expect(workspace.nodesMap['field..third'].color).toBe('green');
  });

  it('updates grouped edge endpoints in Redux without relying on layout', () => {
    const { workspace } = setup();
    const { store } = createMockGraphStore({});
    store.dispatch(workspaceLoaded(createWorkspaceState(workspace)));
    store.dispatch(toggleNodeSelection({ nodeId: 'field..second', replace: true }));
    store.dispatch(toggleNodeSelection({ nodeId: 'field..third', replace: false }));
    store.dispatch(groupSelectedNodes('field..third'));
    const { edgeIds, edgesById } = store.getState().workspace;
    expect(edgesById[edgeIds[0]].topTargetId).toBe('field..third');
    store.dispatch(selectNeighborNodes());
    expect(store.getState().workspace.selectedNodeIds).toContain('field..first');
    store.dispatch(mergeNodes({ parentId: 'field..second', childId: 'field..third' }));
    expect(store.getState().workspace.nodesById['field..third'].parentId).toBeUndefined();
    store.dispatch(undoWorkspace());
    expect(store.getState().workspace.edgesById[edgeIds[0]].topTargetId).toBe('field..second');
  });

  it('restores the blocklist through undo/redo and unblock operations', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));
    store.dispatch(blocklistSelectedNodes());
    expect(workspace.blocklistedNodes.map(({ data }) => data.term)).toEqual(['first']);
    expect(workspace.nodesMap['field..second']).toBeDefined();
    store.dispatch(undoWorkspace());
    expect(workspace.blocklistedNodes).toEqual([]);
    expect(workspace.nodesMap['field..first']).toBeDefined();
    store.dispatch(redoWorkspace());
    store.dispatch(unblockNode('field..first'));
    expect(workspace.blocklistedNodes).toEqual([]);
    expect(store.getState().workspace.blocklistedNodeIds).toEqual([]);
    store.dispatch(undoWorkspace());
    expect(workspace.blocklistedNodes).toHaveLength(1);
    store.dispatch(unblockAllNodes());
    expect(workspace.blocklistedNodes).toEqual([]);
    store.dispatch(undoWorkspace());
    expect(workspace.blocklistedNodes).toHaveLength(1);
  });

  it('records response merges and preserves settled positions through merge undo/redo', () => {
    const { store, workspace, graph } = setup();
    workspace.mergeGraph({ nodes: [{ ...graph.nodes[0], term: 'new', label: 'new' }], edges: [] });
    expect(store.getState().workspace.undoHistory).toHaveLength(1);
    expect(store.getState().workspace.undoHistory[0].nodesById['field..second'].x).toBe(30);
    store.dispatch(undoWorkspace());
    expect(workspace.nodesMap['field..new']).toBeUndefined();
    expect(workspace.nodesMap['field..second'].x).toBe(30);
    store.dispatch(redoWorkspace());
    expect(workspace.nodesMap['field..new']).toBeDefined();
  });

  it('preserves Redux selection across runtime snapshots and clears history when loading or switching', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));
    workspace.selectedNodes = [];
    store.dispatch(workspaceRuntimeChanged(createWorkspaceState(workspace)));
    expect(store.getState().workspace.selectedNodeIds).toEqual(['field..first']);
    store.dispatch(deleteSelectedNodes());
    expect(store.getState().workspace.undoHistory).toHaveLength(1);
    store.dispatch(workspaceLoaded(createWorkspaceState(workspace)));
    expect(store.getState().workspace.undoHistory).toEqual([]);
    store.dispatch(deleteSelectedNodes());
    store.dispatch(datasourceLoaded());
    expect(store.getState().workspace).toMatchObject({
      nodeIds: [],
      edgeIds: [],
      blocklistedNodeIds: [],
      selectedNodeIds: [],
      selectedEdgeIds: [],
      undoHistory: [],
      redoHistory: [],
      isInitialized: false,
    });
  });

  it('clears topology, selections, blocklists and history when loading an empty workspace', () => {
    const { store, workspace, mockedDeps } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..third', replace: true }));
    store.dispatch(blocklistSelectedNodes());
    store.dispatch(toggleNodeSelection({ nodeId: 'field..second', replace: true }));
    store.dispatch(groupSelectedNodes('field..first'));
    store.dispatch(undoWorkspace());
    store.dispatch(clearNodeSelection());
    store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));
    store.dispatch(toggleEdgeSelection(store.getState().workspace.edgeIds[0]));

    expect(workspace.nodes).toHaveLength(2);
    expect(workspace.edges).toHaveLength(1);
    expect(workspace.blocklistedNodes).toHaveLength(1);
    expect(workspace.selectedNodes).toHaveLength(1);
    expect(workspace.getEdgeSelection()).toHaveLength(1);
    expect(store.getState().workspace.undoHistory).toHaveLength(1);
    expect(store.getState().workspace.redoHistory).toHaveLength(1);

    const emptyWorkspace = createWorkspace({});
    emptyWorkspace.stopLayout();
    mockedDeps.getWorkspace.mockReturnValue(emptyWorkspace);
    store.dispatch(workspaceLoaded(createWorkspaceState(emptyWorkspace)));

    expect(emptyWorkspace.nodes).toEqual([]);
    expect(emptyWorkspace.edges).toEqual([]);
    expect(emptyWorkspace.blocklistedNodes).toEqual([]);
    expect(emptyWorkspace.selectedNodes).toEqual([]);
    expect(emptyWorkspace.getEdgeSelection()).toEqual([]);
    expect(store.getState().workspace).toMatchObject({
      nodeIds: [],
      edgeIds: [],
      blocklistedNodeIds: [],
      selectedNodeIds: [],
      selectedEdgeIds: [],
      undoHistory: [],
      redoHistory: [],
    });
  });

  it('bounds undo history and discards redo after a new edit', () => {
    const { store } = setup();
    for (let index = 0; index < 55; index++) {
      if (index % 2 === 0) {
        store.dispatch(mergeNodes({ parentId: 'field..first', childId: 'field..second' }));
      } else {
        store.dispatch(ungroupNode('field..first'));
      }
    }
    expect(store.getState().workspace.undoHistory).toHaveLength(50);
    store.dispatch(undoWorkspace());
    expect(store.getState().workspace.redoHistory).toHaveLength(1);
    store.dispatch(deleteSelectedNodes());
    expect(store.getState().workspace.redoHistory).toEqual([]);
  });
});
