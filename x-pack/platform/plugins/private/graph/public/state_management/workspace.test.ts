/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Workspace } from '../types';
import { createWorkspace } from '../services/workspace/graph_client_workspace';
import { getIcon } from '../helpers/style_choices';
import { createGraphStore, type GraphStore } from './store';
import { fetchTopNodes } from '../services/fetch_top_nodes';
import { setDatasource } from './datasource';
import { loadFields } from './fields';
import { fillWorkspace } from './persistence';
import { createMockGraphStore } from './mocks';
import {
  blocklistSelectedNodes,
  clearNodeSelection,
  colorSelectedNodes,
  createWorkspaceState,
  deleteSelectedNodes,
  groupSelectedNodes,
  mergeNodes,
  initializeWorkspace,
  invertNodeSelection,
  redoWorkspace,
  registerWorkspaceListeners,
  selectAllNodes,
  selectNeighborNodes,
  setNodeLabel,
  submitSearch,
  toggleEdgeSelection,
  toggleNodeSelection,
  unblockAllNodes,
  unblockNode,
  undoWorkspace,
  ungroupNode,
  workspaceChanged,
  workspaceInitializedSelector,
  workspaceGraphMergeStarted,
  workspaceGraphMerged,
  workspaceLoaded,
  workspaceRuntimeChanged,
} from './workspace';

jest.mock('../services/fetch_top_nodes', () => ({
  fetchTopNodes: jest.fn(),
}));

const flushPromises = () => new Promise((resolve) => setTimeout(resolve));

const createWorkspaceMock = () =>
  ({
    mergeGraph: jest.fn(),
    fillInGraph: jest.fn(),
    simpleSearch: jest.fn(),
    search: jest.fn(),
    callElasticsearch: jest.fn(),
    options: {},
    blocklistedNodes: [],
  } as unknown as jest.Mocked<Workspace>);

const createWorkspaceListenerEnvironment = () => {
  const workspace = createWorkspaceMock();
  const environment = createMockGraphStore({
    listeners: [registerWorkspaceListeners],
    mockedDepsOverwrites: {
      getWorkspace: jest.fn(() => workspace),
    },
  });

  environment.store.dispatch(
    setDatasource({ type: 'indexpattern', id: 'data-view-id', title: 'data-view-title' })
  );
  environment.store.dispatch(
    loadFields([
      {
        name: 'field-name',
        selected: true,
        type: 'string',
        aggregatable: true,
        color: 'black',
        icon: { id: 'document', package: 'eui', label: 'Document', prevName: 'document' },
      },
    ])
  );

  return { ...environment, workspace };
};

describe('workspace state', () => {
  it('normalizes the mutable workspace into serializable graph state', () => {
    const parent = {
      id: 'parent',
      x: 1,
      y: 2,
      label: 'Parent',
      color: 'red',
      data: { field: 'field', term: 'parent' },
    };
    const child = {
      id: 'child',
      x: 3,
      y: 4,
      label: 'Child',
      color: 'blue',
      data: { field: 'field', term: 'child' },
      parent,
    };
    const edge = {
      id: 'edge',
      source: parent,
      target: child,
      topSrc: parent,
      topTarget: parent,
      label: 'connection',
      weight: 5,
    };
    const workspace = {
      nodes: [parent, child],
      edges: [edge],
      selectedNodes: [parent],
      getEdgeSelection: () => [edge],
    } as unknown as Workspace;

    const snapshot = createWorkspaceState(workspace);

    expect(snapshot).toEqual({
      nodesById: {
        parent: {
          id: 'parent',
          parentId: undefined,
          x: 1,
          y: 2,
          label: 'Parent',
          color: 'red',
          scaledSize: undefined,
          data: { field: 'field', term: 'parent' },
        },
        child: {
          id: 'child',
          parentId: 'parent',
          x: 3,
          y: 4,
          label: 'Child',
          color: 'blue',
          scaledSize: undefined,
          data: { field: 'field', term: 'child' },
        },
      },
      nodeIds: ['parent', 'child'],
      edgesById: {
        edge: {
          id: 'edge',
          sourceId: 'parent',
          targetId: 'child',
          topSourceId: 'parent',
          topTargetId: 'parent',
          label: 'connection',
          weight: 5,
          width: undefined,
        },
      },
      edgeIds: ['edge'],
      blocklistedNodesById: {},
      blocklistedNodeIds: [],
      selectedNodeIds: ['parent'],
      selectedEdgeIds: ['edge'],
    });

    parent.data.term = 'mutated';
    expect(snapshot.nodesById.parent.data.term).toBe('parent');
  });

  it('keeps node IDs consistent with their maps when workspace IDs repeat', () => {
    const node = {
      id: 'field..term',
      data: { field: 'field', term: 'term' },
      label: 'First',
    };
    const duplicate = { ...node, label: 'Last' };
    const workspace = createWorkspaceMock();
    Object.assign(workspace, {
      nodes: [node, duplicate],
      edges: [],
      blocklistedNodes: [node, duplicate],
    });

    const snapshot = createWorkspaceState(workspace);

    expect(snapshot.nodeIds).toEqual([node.id]);
    expect(snapshot.nodeIds).toEqual(Object.keys(snapshot.nodesById));
    expect(snapshot.nodesById[node.id].label).toBe('Last');
    expect(snapshot.blocklistedNodeIds).toEqual([node.id]);
    expect(snapshot.blocklistedNodeIds).toEqual(Object.keys(snapshot.blocklistedNodesById));
    expect(snapshot.blocklistedNodesById[node.id].label).toBe('Last');
  });

  it('stores normalized workspace snapshots', () => {
    const environment = createMockGraphStore({});
    const workspace = createWorkspaceMock();
    Object.assign(workspace, {
      nodes: [],
      edges: [],
      selectedNodes: [],
      getEdgeSelection: () => [],
    });
    const snapshot = createWorkspaceState(workspace);

    environment.store.dispatch(workspaceChanged(snapshot));

    expect(environment.store.getState().workspace).toEqual({
      ...snapshot,
      isInitialized: false,
      undoHistory: [],
      redoHistory: [],
    });
  });

  it('preserves explicit initialization when storing workspace snapshots', () => {
    const environment = createMockGraphStore({});
    const snapshot = createWorkspaceState({
      nodes: [],
      edges: [],
      blocklistedNodes: [],
    } as unknown as Workspace);

    environment.store.dispatch(initializeWorkspace());
    environment.store.dispatch(workspaceChanged(snapshot));

    expect(workspaceInitializedSelector(environment.store.getState())).toBe(true);
  });

  it('handles node selection operations using normalized IDs', () => {
    const environment = createMockGraphStore({});
    const workspace = createWorkspaceMock();
    Object.assign(workspace, {
      nodes: [
        { id: 'one', parent: undefined, data: {} },
        { id: 'two', parent: undefined, data: {} },
        { id: 'child', parent: { id: 'one' }, data: {} },
      ],
      edges: [
        {
          id: 'edge',
          source: { id: 'one' },
          target: { id: 'two' },
          topSrc: { id: 'one' },
          topTarget: { id: 'two' },
        },
      ],
      selectedNodes: [],
      getEdgeSelection: () => [],
    });
    environment.store.dispatch(workspaceChanged(createWorkspaceState(workspace)));

    environment.store.dispatch(selectAllNodes());
    expect(environment.store.getState().workspace.selectedNodeIds).toEqual(['one', 'two']);

    environment.store.dispatch(invertNodeSelection());
    expect(environment.store.getState().workspace.selectedNodeIds).toEqual([]);

    environment.store.dispatch(toggleNodeSelection({ nodeId: 'one', replace: false }));
    environment.store.dispatch(selectNeighborNodes());
    expect(environment.store.getState().workspace.selectedNodeIds).toEqual(['one', 'two']);

    environment.store.dispatch(clearNodeSelection());
    expect(environment.store.getState().workspace.selectedNodeIds).toEqual([]);
  });

  it('updates labels and colors selected nodes and their grouped descendants', () => {
    const environment = createMockGraphStore({});
    const node = { x: 1, y: 1, scaledSize: 10, data: { field: 'field', term: 'term' } };
    const state = {
      ...environment.store.getState().workspace,
      nodesById: {
        selected: { ...node, id: 'selected', label: 'Old', color: 'red' },
        child: { ...node, id: 'child', label: 'Child', parentId: 'selected', color: 'red' },
        other: { ...node, id: 'other', label: 'Other', color: 'green' },
      },
      nodeIds: ['selected', 'child', 'other'],
      selectedNodeIds: ['selected'],
    };
    environment.store.dispatch(workspaceChanged(state));
    environment.store.dispatch(setNodeLabel({ nodeId: 'selected', label: 'New' }));
    environment.store.dispatch(colorSelectedNodes('blue'));
    expect(environment.store.getState().workspace.nodesById.selected).toMatchObject({
      label: 'New',
      color: 'blue',
    });
    expect(environment.store.getState().workspace.nodesById.child.color).toBe('blue');
    expect(environment.store.getState().workspace.nodesById.other.color).toBe('green');
    environment.store.dispatch(clearNodeSelection());
    environment.store.dispatch(colorSelectedNodes('red'));
    expect(environment.store.getState().workspace.nodesById.selected.color).toBe('blue');
  });

  describe('topology and history snapshots', () => {
    const workspaces: Workspace[] = [];
    const setup = () => {
      const workspace = createWorkspace({
        graphMergeStarted: () => store.dispatch(workspaceGraphMergeStarted()),
        topologyChangeHandler: () =>
          store.dispatch(workspaceGraphMerged(createWorkspaceState(workspace))),
      });
      workspaces.push(workspace);
      const { mockedDeps } = createMockGraphStore({});
      mockedDeps.getWorkspace.mockReturnValue(workspace);
      mockedDeps.notifyReact.mockImplementation(() =>
        store.dispatch(workspaceRuntimeChanged(createWorkspaceState(workspace)))
      );
      const store: GraphStore = createGraphStore(mockedDeps);
      workspace.mergeGraph({
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
      });
      workspace.stopLayout();
      store.dispatch(workspaceLoaded(createWorkspaceState(workspace)));
      return { store, workspace };
    };
    afterEach(() => {
      workspaces.forEach((workspace) => workspace.stopLayout());
      workspaces.length = 0;
    });

    it('removes selected groups and their dangling edges', () => {
      const { store, workspace } = setup();
      store.dispatch(mergeNodes({ parentId: 'field..third', childId: 'field..second' }));
      store.dispatch(toggleNodeSelection({ nodeId: 'field..third', replace: true }));

      store.dispatch(deleteSelectedNodes());

      expect(store.getState().workspace.nodeIds).toEqual(['field..first']);
      expect(store.getState().workspace.edgeIds).toEqual([]);
      expect(workspace.nodesMap['field..second']).toBeUndefined();
      expect(workspace.edges).toEqual([]);
      expect(store.getState().workspace.edgesById).toEqual({});
    });

    it('moves selected nodes into the blocklist', () => {
      const { store } = setup();
      store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));

      store.dispatch(blocklistSelectedNodes());

      expect(store.getState().workspace.nodeIds).toEqual(['field..second', 'field..third']);
      expect(store.getState().workspace.blocklistedNodeIds).toEqual(['field..first']);
      expect(store.getState().workspace.edgeIds).toEqual([]);
      expect(store.getState().workspace.selectedNodeIds).toEqual([]);
    });

    it('keeps normalized blocklisted IDs consistent when the runtime contains an existing ID', () => {
      const { store, workspace } = setup();
      const selected = workspace.nodesMap['field..first'];
      workspace.blocklistedNodes.push({ ...selected, label: 'Existing' });
      store.dispatch(workspaceRuntimeChanged(createWorkspaceState(workspace)));
      store.dispatch(setNodeLabel({ nodeId: selected.id, label: 'Selected' }));
      store.dispatch(toggleNodeSelection({ nodeId: selected.id, replace: true }));

      store.dispatch(blocklistSelectedNodes());

      const { blocklistedNodeIds, blocklistedNodesById, nodeIds } = store.getState().workspace;
      expect(nodeIds).not.toContain(selected.id);
      expect(blocklistedNodeIds).toEqual([selected.id]);
      expect(blocklistedNodeIds).toEqual(Object.keys(blocklistedNodesById));
      expect(blocklistedNodesById[selected.id].label).toBe('Selected');
    });

    it('removes all nodes when deleting with no selection', () => {
      const { store } = setup();

      store.dispatch(deleteSelectedNodes());

      expect(store.getState().workspace.nodeIds).toEqual([]);
      expect(store.getState().workspace.nodesById).toEqual({});
      expect(store.getState().workspace.edgeIds).toEqual([]);
      expect(store.getState().workspace.edgesById).toEqual({});
    });

    it('does not blocklist nodes when there is no selection', () => {
      const { store } = setup();

      store.dispatch(blocklistSelectedNodes());

      expect(store.getState().workspace.nodeIds).toEqual([
        'field..first',
        'field..second',
        'field..third',
      ]);
      expect(store.getState().workspace.blocklistedNodeIds).toEqual([]);
    });

    it('groups selected top-level nodes without reparenting already grouped nodes', () => {
      const { store } = setup();
      store.dispatch(mergeNodes({ parentId: 'field..first', childId: 'field..second' }));
      store.dispatch(toggleNodeSelection({ nodeId: 'field..second', replace: false }));
      store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: false }));

      store.dispatch(groupSelectedNodes('field..third'));

      expect(store.getState().workspace.nodesById['field..first'].parentId).toBe('field..third');
      expect(store.getState().workspace.nodesById['field..second'].parentId).toBe('field..first');
      expect(store.getState().workspace.selectedNodeIds).toEqual(['field..third']);
      store.dispatch(ungroupNode('field..third'));
      expect(store.getState().workspace.nodesById['field..first'].parentId).toBeUndefined();
      expect(store.getState().workspace.nodesById['field..second'].parentId).toBe('field..first');
    });

    it('removes individual and all blocklisted nodes', () => {
      const { store, workspace } = setup();
      store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));
      store.dispatch(toggleNodeSelection({ nodeId: 'field..second', replace: false }));
      const first = workspace.nodesMap['field..first'];
      store.dispatch(blocklistSelectedNodes());

      store.dispatch(unblockNode(first.id));

      expect(store.getState().workspace.blocklistedNodeIds).toEqual(['field..second']);
      expect(store.getState().workspace.blocklistedNodesById['field..first']).toBeUndefined();
      store.dispatch(unblockAllNodes());
      expect(store.getState().workspace.blocklistedNodeIds).toEqual([]);
      expect(store.getState().workspace.blocklistedNodesById).toEqual({});
    });

    it('undoes and redoes topology changes while publishing serializable snapshots', () => {
      const { store, workspace } = setup();
      store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));
      const historyLength = store.getState().workspace.undoHistory.length;
      store.dispatch(deleteSelectedNodes());
      expect(store.getState().workspace.undoHistory).toHaveLength(historyLength + 1);
      expect(store.getState().workspace.nodeIds).toEqual(['field..second', 'field..third']);

      store.dispatch(undoWorkspace());
      expect(store.getState().workspace.nodeIds).toContain('field..first');
      expect(store.getState().workspace.redoHistory).toHaveLength(1);
      store.dispatch(redoWorkspace());
      expect(store.getState().workspace.nodeIds).not.toContain('field..first');
      expect(store.getState().workspace.undoHistory).toHaveLength(historyLength + 1);
      const snapshot = createWorkspaceState(workspace);
      expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    });

    it('preserves history across runtime snapshots and initialization across undo and redo', () => {
      const { store, workspace } = setup();
      store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));
      store.dispatch(deleteSelectedNodes());
      const { undoHistory } = store.getState().workspace;

      expect(undoHistory).toHaveLength(1);
      expect(undoHistory[0]).not.toHaveProperty('isInitialized');
      expect(undoHistory[0]).not.toHaveProperty('undoHistory');
      expect(undoHistory[0]).not.toHaveProperty('redoHistory');

      store.dispatch(initializeWorkspace());
      store.dispatch(workspaceRuntimeChanged(createWorkspaceState(workspace)));
      expect(store.getState().workspace.undoHistory).toEqual(undoHistory);
      expect(workspaceInitializedSelector(store.getState())).toBe(true);

      store.dispatch(undoWorkspace());
      expect(workspaceInitializedSelector(store.getState())).toBe(true);
      const { redoHistory } = store.getState().workspace;
      expect(redoHistory).toHaveLength(1);

      store.dispatch(workspaceRuntimeChanged(createWorkspaceState(workspace)));
      expect(store.getState().workspace.redoHistory).toEqual(redoHistory);
      store.dispatch(redoWorkspace());
      expect(workspaceInitializedSelector(store.getState())).toBe(true);
      expect(store.getState().workspace.undoHistory).toHaveLength(1);
    });
  });

  it('keeps edge selection single-valued', () => {
    const environment = createMockGraphStore({});

    environment.store.dispatch(toggleEdgeSelection('first'));
    expect(environment.store.getState().workspace.selectedEdgeIds).toEqual(['first']);

    environment.store.dispatch(toggleEdgeSelection('second'));
    expect(environment.store.getState().workspace.selectedEdgeIds).toEqual(['second']);

    environment.store.dispatch(toggleEdgeSelection('second'));
    expect(environment.store.getState().workspace.selectedEdgeIds).toEqual([]);
  });
});

describe('workspace listeners', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fill workspace', () => {
    it('merges fetched nodes and initializes the workspace', async () => {
      const environment = createWorkspaceListenerEnvironment();
      const nodes = [{ id: 'node-id' }];
      (fetchTopNodes as jest.Mock).mockResolvedValue(nodes);

      environment.store.dispatch(fillWorkspace());
      await flushPromises();

      expect(fetchTopNodes).toHaveBeenCalledWith(
        environment.mockedDeps.http.post,
        'data-view-title',
        [expect.objectContaining({ name: 'field-name' })]
      );
      expect(environment.workspace.mergeGraph).toHaveBeenCalledWith({ nodes, edges: [] });
      expect(workspaceInitializedSelector(environment.store.getState())).toBe(true);
      expect(environment.mockedDeps.notifyReact).toHaveBeenCalled();
      expect(environment.workspace.fillInGraph).toHaveBeenCalledWith(10);
    });

    it('does not apply a stale response after a newer request', async () => {
      const environment = createWorkspaceListenerEnvironment();
      let resolveFirstRequest: (nodes: Array<{ id: string }>) => void = () => {};
      const firstRequest = new Promise<Array<{ id: string }>>((resolve) => {
        resolveFirstRequest = resolve;
      });
      (fetchTopNodes as jest.Mock)
        .mockReturnValueOnce(firstRequest)
        .mockResolvedValueOnce([{ id: 'new-node' }]);

      environment.store.dispatch(fillWorkspace());
      environment.store.dispatch(fillWorkspace());
      await flushPromises();

      resolveFirstRequest([{ id: 'stale-node' }]);
      await flushPromises();

      expect(environment.workspace.mergeGraph).toHaveBeenCalledTimes(1);
      expect(environment.workspace.mergeGraph).toHaveBeenCalledWith({
        nodes: [{ id: 'new-node' }],
        edges: [],
      });
    });

    it('shows the server-provided message when fetching fails', async () => {
      const environment = createWorkspaceListenerEnvironment();
      (fetchTopNodes as jest.Mock).mockRejectedValue({
        body: { message: 'server failure' },
      });

      environment.store.dispatch(fillWorkspace());
      await flushPromises();

      expect(environment.mockedDeps.notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: 'Fetching top terms failed: server failure',
      });
    });
  });

  describe('submit search', () => {
    it('submits a plain text search', () => {
      const environment = createWorkspaceListenerEnvironment();

      environment.store.dispatch(submitSearch('search text'));

      expect(environment.workspace.simpleSearch).toHaveBeenCalledWith('search text', [], 2);
    });

    it('submits a query DSL search', () => {
      const environment = createWorkspaceListenerEnvironment();
      const query = { query: { match_all: {} } };

      environment.store.dispatch(submitSearch(JSON.stringify(query)));

      expect(environment.workspace.search).toHaveBeenCalledWith(query, [], 2);
    });

    it('submits a Graph explore request', () => {
      const environment = createWorkspaceListenerEnvironment();
      const query = { vertices: [{ field: 'field-name' }] };

      environment.store.dispatch(submitSearch(JSON.stringify(query)));

      expect(environment.workspace.callElasticsearch).toHaveBeenCalledWith(query);
    });

    it('reports malformed JSON', () => {
      const environment = createWorkspaceListenerEnvironment();

      environment.store.dispatch(submitSearch('{invalid'));

      expect(environment.mockedDeps.handleSearchQueryError).toHaveBeenCalledWith(
        expect.any(SyntaxError)
      );
    });
  });
});
