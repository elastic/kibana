/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Workspace } from '../types';
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
  invertNodeSelection,
  mergeNodes,
  redoWorkspace,
  registerWorkspaceListeners,
  selectAllNodes,
  selectNeighborNodes,
  setNodeLabel,
  startWorkspaceLayout,
  stopWorkspaceLayout,
  submitSearch,
  toggleEdgeSelection,
  toggleNodeSelection,
  unblockAllNodes,
  unblockNode,
  undoWorkspace,
  ungroupNode,
  workspaceChanged,
  workspaceInitializedSelector,
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
    runLayout: jest.fn(),
    stopLayout: jest.fn(),
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
      isSelected: true,
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

    expect(createWorkspaceState(workspace)).toEqual({
      isInitialized: true,
      isLayoutRunning: false,
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
      selectedNodeIds: ['parent'],
      selectedEdgeIds: ['edge'],
      blocklistedNodesById: {},
      blocklistedNodeIds: [],
      undoHistory: [],
      redoHistory: [],
    });
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

    expect(environment.store.getState().workspace).toEqual(snapshot);
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

  it('removes selected groups and their dangling edges', () => {
    const environment = createMockGraphStore({});
    const state = {
      ...environment.store.getState().workspace,
      nodesById: {
        parent: { id: 'parent' },
        child: { id: 'child', parentId: 'parent' },
        remaining: { id: 'remaining' },
      },
      nodeIds: ['parent', 'child', 'remaining'],
      edgesById: {
        removed: { id: 'removed', sourceId: 'child', targetId: 'remaining' },
      },
      edgeIds: ['removed'],
      selectedNodeIds: ['parent'],
    } as unknown as ReturnType<typeof environment.store.getState>['workspace'];
    environment.store.dispatch(workspaceChanged(state));

    environment.store.dispatch(deleteSelectedNodes());

    expect(environment.store.getState().workspace.nodeIds).toEqual(['remaining']);
    expect(environment.store.getState().workspace.edgeIds).toEqual([]);
  });

  it('moves selected nodes into the blocklist', () => {
    const environment = createMockGraphStore({});
    const state = {
      ...environment.store.getState().workspace,
      nodesById: { selected: { id: 'selected' }, remaining: { id: 'remaining' } },
      nodeIds: ['selected', 'remaining'],
      selectedNodeIds: ['selected'],
    } as unknown as ReturnType<typeof environment.store.getState>['workspace'];
    environment.store.dispatch(workspaceChanged(state));

    environment.store.dispatch(blocklistSelectedNodes());

    expect(environment.store.getState().workspace.nodeIds).toEqual(['remaining']);
    expect(environment.store.getState().workspace.blocklistedNodeIds).toEqual(['selected']);
  });

  it('groups selected top-level nodes and ungroups the children', () => {
    const environment = createMockGraphStore({});
    const state = {
      ...environment.store.getState().workspace,
      nodesById: {
        parent: { id: 'parent' },
        child: { id: 'child' },
        alreadyGrouped: { id: 'alreadyGrouped', parentId: 'other' },
      },
      nodeIds: ['parent', 'child', 'alreadyGrouped'],
      selectedNodeIds: ['parent', 'child', 'alreadyGrouped'],
    } as unknown as ReturnType<typeof environment.store.getState>['workspace'];
    environment.store.dispatch(workspaceChanged(state));

    environment.store.dispatch(groupSelectedNodes('parent'));

    expect(environment.store.getState().workspace.nodesById.child.parentId).toBe('parent');
    expect(environment.store.getState().workspace.nodesById.alreadyGrouped.parentId).toBe('other');
    expect(environment.store.getState().workspace.selectedNodeIds).toEqual(['parent']);

    environment.store.dispatch(ungroupNode('parent'));
    expect(environment.store.getState().workspace.nodesById.child.parentId).toBeUndefined();
  });

  it('merges one node into another', () => {
    const environment = createMockGraphStore({});
    const state = {
      ...environment.store.getState().workspace,
      nodesById: { parent: { id: 'parent' }, child: { id: 'child' } },
      nodeIds: ['parent', 'child'],
      selectedNodeIds: ['parent', 'child'],
    } as unknown as ReturnType<typeof environment.store.getState>['workspace'];
    environment.store.dispatch(workspaceChanged(state));

    environment.store.dispatch(mergeNodes({ parentId: 'parent', childId: 'child' }));

    expect(environment.store.getState().workspace.nodesById.child.parentId).toBe('parent');
    expect(environment.store.getState().workspace.selectedNodeIds).toEqual(['parent']);
    expect(environment.store.getState().workspace.undoHistory).toHaveLength(1);
  });

  it('removes individual and all blocklisted nodes', () => {
    const environment = createMockGraphStore({});
    const state = {
      ...environment.store.getState().workspace,
      blocklistedNodesById: { first: { id: 'first' }, second: { id: 'second' } },
      blocklistedNodeIds: ['first', 'second'],
    } as unknown as ReturnType<typeof environment.store.getState>['workspace'];
    environment.store.dispatch(workspaceChanged(state));

    environment.store.dispatch(unblockNode('first'));
    expect(environment.store.getState().workspace.blocklistedNodeIds).toEqual(['second']);
    expect(environment.store.getState().workspace.blocklistedNodesById.first).toBeUndefined();

    environment.store.dispatch(unblockAllNodes());
    expect(environment.store.getState().workspace.blocklistedNodeIds).toEqual([]);
    expect(environment.store.getState().workspace.blocklistedNodesById).toEqual({});
  });

  it('undoes and redoes topology changes using serializable snapshots', () => {
    const environment = createMockGraphStore({});
    const state = {
      ...environment.store.getState().workspace,
      nodesById: { selected: { id: 'selected' }, remaining: { id: 'remaining' } },
      nodeIds: ['selected', 'remaining'],
      selectedNodeIds: ['selected'],
    } as unknown as ReturnType<typeof environment.store.getState>['workspace'];
    environment.store.dispatch(workspaceChanged(state));
    environment.store.dispatch(deleteSelectedNodes());

    expect(environment.store.getState().workspace.nodeIds).toEqual(['remaining']);
    expect(environment.store.getState().workspace.undoHistory).toHaveLength(1);

    environment.store.dispatch(undoWorkspace());
    expect(environment.store.getState().workspace.nodeIds).toEqual(['selected', 'remaining']);
    expect(environment.store.getState().workspace.redoHistory).toHaveLength(1);

    environment.store.dispatch(redoWorkspace());
    expect(environment.store.getState().workspace.nodeIds).toEqual(['remaining']);
    expect(environment.store.getState().workspace.undoHistory).toHaveLength(1);
  });

  it('updates labels and selected-node colors', () => {
    const environment = createMockGraphStore({});
    const state = {
      ...environment.store.getState().workspace,
      nodesById: {
        selected: { id: 'selected', label: 'Old', color: 'red' },
        other: { id: 'other', label: 'Other', color: 'green' },
      },
      nodeIds: ['selected', 'other'],
      selectedNodeIds: ['selected'],
    } as unknown as ReturnType<typeof environment.store.getState>['workspace'];
    environment.store.dispatch(workspaceChanged(state));

    environment.store.dispatch(setNodeLabel({ nodeId: 'selected', label: 'New' }));
    environment.store.dispatch(colorSelectedNodes('blue'));

    expect(environment.store.getState().workspace.nodesById.selected).toMatchObject({
      label: 'New',
      color: 'blue',
    });
    expect(environment.store.getState().workspace.nodesById.other.color).toBe('green');
  });

  it('tracks layout lifecycle state', () => {
    const environment = createMockGraphStore({});

    environment.store.dispatch(startWorkspaceLayout());
    expect(environment.store.getState().workspace.isLayoutRunning).toBe(true);

    environment.store.dispatch(stopWorkspaceLayout());
    expect(environment.store.getState().workspace.isLayoutRunning).toBe(false);
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

  describe('layout lifecycle', () => {
    it('starts and stops the legacy layout runtime', () => {
      const environment = createWorkspaceListenerEnvironment();

      environment.store.dispatch(startWorkspaceLayout());
      environment.store.dispatch(stopWorkspaceLayout());

      expect(environment.workspace.runLayout).toHaveBeenCalled();
      expect(environment.workspace.stopLayout).toHaveBeenCalled();
      expect(environment.mockedDeps.notifyReact).toHaveBeenCalled();
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
