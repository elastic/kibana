/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GraphWorkspaceSavedObject,
  RuntimeGraph,
  WorkspaceField,
  WorkspaceNode,
} from '../types';
import { fetchTopNodes } from '../services/fetch_top_nodes';
import { setDatasource } from './datasource';
import { loadFields, selectedFieldsSelector } from './fields';
import { fillWorkspace } from './persistence';
import { createMockGraphStore } from './mocks';
import { reduxStateToSavedWorkspace } from '../services/persistence/serialize';
import { makeNodeId } from '../services/workspace/graph_merge_planner';
import {
  blocklistSelectedNodes,
  clearNodeSelection,
  colorSelectedNodes,
  createRuntimeGraphState,
  deleteSelectedNodes,
  expandSelectedNodes,
  fillWorkspaceConnections,
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
  workspaceGraphMerged,
  workspaceInitializedSelector,
  workspaceRuntimeChanged,
} from './workspace';

jest.mock('../services/fetch_top_nodes', () => ({
  fetchTopNodes: jest.fn(),
}));

const flushPromises = () => new Promise((resolve) => setTimeout(resolve));

const createRuntimeGraphMock = () =>
  ({
    mergeGraph: jest.fn(),
    layoutController: {
      start: jest.fn(),
      stop: jest.fn(),
      isRunning: jest.fn(() => false),
    },
    nodes: [],
    nodesMap: {},
    edges: [],
    edgesMap: {},
    options: {
      indexName: 'data-view-title',
      vertex_fields: [],
      exploreControls: {
        sampleSize: 100,
        useSignificance: true,
        minDocCount: 3,
        maxValuesPerDoc: 1,
        timeoutMillis: 5000,
      },
    },
    blocklistedNodes: [],
  } as unknown as jest.Mocked<RuntimeGraph> & { mergeGraph: jest.Mock });

const addRuntimeNode = (runtimeGraph: RuntimeGraph, id = 'selected') => {
  const node = {
    id,
    parent: null,
    data: { field: 'field-name', term: id },
  } as WorkspaceNode;
  runtimeGraph.nodes.push(node);
  runtimeGraph.nodesMap[id] = node;
};

const createRuntimeGraphListenerEnvironment = () => {
  const workspace = createRuntimeGraphMock();
  const environment = createMockGraphStore({
    listeners: [registerWorkspaceListeners],
    mockedDepsOverwrites: {
      getRuntimeGraph: jest.fn(() => workspace),
      exploreGraph: jest.fn().mockResolvedValue({ vertices: [], connections: [] }),
      searchGraph: jest.fn((_index: string, _request: object) => new Promise(() => {})),
      mergeRuntimeGraph: jest.fn((_workspace, graph) => {
        workspace.mergeGraph(graph);
        graph.nodes.forEach((node, index) => {
          const id =
            node.id ?? makeNodeId(node.field ?? 'field-name', node.term ?? `node-${index}`);
          const runtimeNode = {
            id,
            parent: null,
            data: { field: node.field ?? 'field-name', term: node.term ?? id },
          } as WorkspaceNode;
          workspace.nodes.push(runtimeNode);
          workspace.nodesMap[id] = runtimeNode;
        });
      }),
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

const expectRuntimeTopologyToMatchRedux = (
  environment: ReturnType<typeof createRuntimeGraphListenerEnvironment>
) => {
  const { workspace: workspaceState } = environment.store.getState();
  expect(new Set(Object.keys(environment.workspace.nodesMap))).toEqual(
    new Set(workspaceState.nodeIds)
  );
  expect(new Set(Object.keys(environment.workspace.edgesMap))).toEqual(
    new Set(workspaceState.edgeIds)
  );
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
      layoutController: { isRunning: () => false },
      selectedNodes: [parent],
      getEdgeSelection: () => [edge],
    } as unknown as RuntimeGraph;

    expect(createRuntimeGraphState(workspace)).toEqual({
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
      selectedNodeIds: [],
      selectedEdgeIds: [],
      blocklistedNodesById: {},
      blocklistedNodeIds: [],
      undoHistory: [],
      redoHistory: [],
    });
  });

  it('stores normalized workspace snapshots', () => {
    const environment = createMockGraphStore({});
    const workspace = createRuntimeGraphMock();
    Object.assign(workspace, {
      nodes: [],
      edges: [],
      selectedNodes: [],
      getEdgeSelection: () => [],
    });
    const snapshot = createRuntimeGraphState(workspace);

    environment.store.dispatch(workspaceChanged(snapshot));

    expect(environment.store.getState().workspace).toEqual(snapshot);
  });

  it('records response merges in serializable undo history', () => {
    const environment = createMockGraphStore({});
    environment.store.dispatch(
      workspaceGraphMerged({
        nodes: [{ field: 'field', term: 'term', label: 'Term' }],
        edges: [],
      })
    );

    environment.store.dispatch(undoWorkspace());
    expect(environment.store.getState().workspace.nodeIds).toEqual([]);

    environment.store.dispatch(redoWorkspace());
    expect(environment.store.getState().workspace.nodeIds).toEqual(['field..term']);
  });

  it('preserves Redux selection across runtime snapshots', () => {
    const environment = createMockGraphStore({});
    environment.store.dispatch(toggleNodeSelection({ nodeId: 'selected', replace: false }));
    const runtimeSnapshot = {
      ...environment.store.getState().workspace,
      selectedNodeIds: [],
      selectedEdgeIds: [],
    };

    environment.store.dispatch(workspaceRuntimeChanged(runtimeSnapshot));

    expect(environment.store.getState().workspace.selectedNodeIds).toEqual(['selected']);
  });

  it('handles node selection operations using normalized IDs', () => {
    const environment = createMockGraphStore({});
    const workspace = createRuntimeGraphMock();
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
    environment.store.dispatch(workspaceChanged(createRuntimeGraphState(workspace)));

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

    environment.store.dispatch(undoWorkspace());
    expect(environment.store.getState().workspace.nodeIds).toEqual(['selected', 'remaining']);
    expect(environment.store.getState().workspace.blocklistedNodeIds).toEqual([]);
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
      const environment = createRuntimeGraphListenerEnvironment();
      const nodes = [{ field: 'field-name', term: 'top-term' }];
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
      expect(environment.mockedDeps.searchGraph).toHaveBeenCalled();
      expectRuntimeTopologyToMatchRedux(environment);
    });

    it('keeps fetched top-term nodes in Redux when connection filling fails', async () => {
      const environment = createRuntimeGraphListenerEnvironment();
      const nodes = [{ field: 'field-name', term: 'top-term' }];
      (fetchTopNodes as jest.Mock).mockResolvedValue(nodes);
      environment.mockedDeps.searchGraph.mockRejectedValue(new Error('connection failure'));

      environment.store.dispatch(fillWorkspace());
      await flushPromises();

      const { workspace } = environment.store.getState();
      expect(workspace.nodeIds).toEqual(['field-name..top-term']);
      expect(workspace.nodesById['field-name..top-term']).toMatchObject({
        data: { field: 'field-name', term: 'top-term' },
      });
      expect(environment.workspace.mergeGraph).toHaveBeenCalledWith({ nodes, edges: [] });
      expect(environment.mockedDeps.handleSearchQueryError).toHaveBeenCalledWith(
        new Error('connection failure')
      );
      expectRuntimeTopologyToMatchRedux(environment);

      const savedWorkspace = { wsState: '' } as GraphWorkspaceSavedObject;
      const selectedIndex = environment.store.getState().datasource.current;
      if (selectedIndex.type === 'none') {
        throw new Error('Expected an index-pattern datasource');
      }
      reduxStateToSavedWorkspace(
        savedWorkspace,
        {
          workspace,
          urlTemplates: environment.store.getState().urlTemplates,
          advancedSettings: environment.store.getState().advancedSettings,
          selectedIndex,
          selectedFields: selectedFieldsSelector(environment.store.getState()),
        },
        true
      );
      expect(savedWorkspace.numVertices).toBe(1);
      expect(JSON.parse(savedWorkspace.wsState).vertices).toEqual([
        expect.objectContaining({ field: 'field-name', term: 'top-term' }),
      ]);
    });

    it('does not apply a stale response after a newer request', async () => {
      const environment = createRuntimeGraphListenerEnvironment();
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
      const environment = createRuntimeGraphListenerEnvironment();
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

  describe('topology commands', () => {
    it('synchronizes Redux topology into the runtime adapter', () => {
      const environment = createRuntimeGraphListenerEnvironment();
      environment.store.dispatch(toggleNodeSelection({ nodeId: 'selected', replace: false }));

      environment.store.dispatch(deleteSelectedNodes());

      expect(environment.mockedDeps.getLayoutController()!.start).toHaveBeenCalled();
    });
  });

  describe('workspace requests', () => {
    it('expands selected nodes through the listener transport', async () => {
      const environment = createRuntimeGraphListenerEnvironment();
      const fields = [{ name: 'field' }] as WorkspaceField[];

      environment.store.dispatch(toggleNodeSelection({ nodeId: 'selected', replace: false }));
      environment.store.dispatch(expandSelectedNodes(fields));
      await flushPromises();

      expect(environment.mockedDeps.exploreGraph).toHaveBeenCalledWith(
        'data-view-title',
        expect.objectContaining({ connections: { vertices: expect.any(Array) } })
      );
      expect(environment.workspace.mergeGraph).toHaveBeenCalledWith({ nodes: [], edges: [] });
      expectRuntimeTopologyToMatchRedux(environment);
    });

    it('fills existing connections through the listener transport', async () => {
      const environment = createRuntimeGraphListenerEnvironment();
      addRuntimeNode(environment.workspace);
      environment.mockedDeps.searchGraph.mockResolvedValue({
        hits: { total: { value: 0 } },
        aggregations: { matrix: { buckets: [] } },
      });
      environment.store.dispatch(toggleNodeSelection({ nodeId: 'selected', replace: false }));

      environment.store.dispatch(fillWorkspaceConnections(20));
      await flushPromises();

      expect(environment.mockedDeps.searchGraph).toHaveBeenCalledWith(
        'data-view-title',
        expect.objectContaining({ size: 0 })
      );
      expect(environment.workspace.mergeGraph).toHaveBeenCalledWith({
        nodes: [{ field: 'field-name', term: 'selected' }],
        edges: [],
      });
    });

    it('ignores stale fill-connection responses', async () => {
      const environment = createRuntimeGraphListenerEnvironment();
      addRuntimeNode(environment.workspace);
      const resolvers: Array<
        (response: {
          hits: { total: { value: number } };
          aggregations: { matrix: { buckets: [] } };
        }) => void
      > = [];
      environment.mockedDeps.searchGraph.mockImplementation(
        () => new Promise((resolve) => resolvers.push(resolve))
      );

      environment.store.dispatch(fillWorkspaceConnections(10));
      environment.store.dispatch(fillWorkspaceConnections(10));
      const response = {
        hits: { total: { value: 0 } },
        aggregations: { matrix: { buckets: [] as [] } },
      };
      resolvers[1](response);
      await flushPromises();
      resolvers[0](response);
      await flushPromises();

      expect(environment.workspace.mergeGraph).toHaveBeenCalledTimes(1);
    });

    it('ignores stale expand responses', async () => {
      const environment = createRuntimeGraphListenerEnvironment();
      const fields = [{ name: 'field' }] as WorkspaceField[];
      const resolvers: Array<(response: { vertices: []; connections: [] }) => void> = [];
      environment.mockedDeps.exploreGraph.mockImplementation(
        () => new Promise((resolve) => resolvers.push(resolve))
      );

      environment.store.dispatch(expandSelectedNodes(fields));
      environment.store.dispatch(expandSelectedNodes(fields));
      resolvers[1]({ vertices: [], connections: [] });
      await flushPromises();
      resolvers[0]({ vertices: [], connections: [] });
      await flushPromises();

      expect(environment.workspace.mergeGraph).toHaveBeenCalledTimes(1);
    });
  });

  describe('layout lifecycle', () => {
    it('starts and stops the legacy layout runtime', () => {
      const environment = createRuntimeGraphListenerEnvironment();

      environment.store.dispatch(startWorkspaceLayout());
      environment.store.dispatch(stopWorkspaceLayout());

      expect(environment.mockedDeps.getLayoutController()!.start).toHaveBeenCalled();
      expect(environment.mockedDeps.getLayoutController()!.stop).toHaveBeenCalled();
      expect(environment.mockedDeps.notifyReact).toHaveBeenCalled();
    });
  });

  describe('submit search', () => {
    it('merges plain text search results into Redux before the runtime', async () => {
      const environment = createRuntimeGraphListenerEnvironment();
      environment.mockedDeps.exploreGraph.mockResolvedValue({
        vertices: [{ field: 'field-name', term: 'result', weight: 1 }],
        connections: [],
      });
      environment.workspace.mergeGraph.mockImplementation(() => {
        expect(environment.store.getState().workspace.nodeIds).toEqual(['field-name..result']);
      });

      environment.store.dispatch(submitSearch('search text'));
      await flushPromises();

      expect(environment.mockedDeps.exploreGraph).toHaveBeenCalledWith(
        'data-view-title',
        expect.objectContaining({ query: { query_string: { query: 'search text' } } })
      );
      expect(environment.workspace.mergeGraph).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: [expect.objectContaining({ field: 'field-name', term: 'result' })],
          edges: [],
        })
      );
      expectRuntimeTopologyToMatchRedux(environment);
    });

    it('submits a query DSL search through the listener transport', async () => {
      const environment = createRuntimeGraphListenerEnvironment();
      const query = { query: { match_all: {} } };

      environment.store.dispatch(submitSearch(JSON.stringify(query)));
      await flushPromises();

      expect(environment.mockedDeps.exploreGraph).toHaveBeenCalledWith(
        'data-view-title',
        expect.objectContaining({ query })
      );
    });

    it('submits a Graph explore request unchanged', async () => {
      const environment = createRuntimeGraphListenerEnvironment();
      const query = { vertices: [{ field: 'field-name' }] };

      environment.store.dispatch(submitSearch(JSON.stringify(query)));
      await flushPromises();

      expect(environment.mockedDeps.exploreGraph).toHaveBeenCalledWith('data-view-title', query);
    });

    it('ignores stale search responses', async () => {
      const environment = createRuntimeGraphListenerEnvironment();
      const resolvers: Array<(response: { vertices: []; connections: [] }) => void> = [];
      environment.mockedDeps.exploreGraph.mockImplementation(
        () => new Promise((resolve) => resolvers.push(resolve))
      );

      environment.store.dispatch(submitSearch('first'));
      environment.store.dispatch(submitSearch('second'));
      resolvers[1]({ vertices: [], connections: [] });
      await flushPromises();
      resolvers[0]({ vertices: [], connections: [] });
      await flushPromises();

      expect(environment.workspace.mergeGraph).toHaveBeenCalledTimes(1);
    });

    it('reports malformed JSON', () => {
      const environment = createRuntimeGraphListenerEnvironment();

      environment.store.dispatch(submitSearch('{invalid'));

      expect(environment.mockedDeps.handleSearchQueryError).toHaveBeenCalledWith(
        expect.any(SyntaxError)
      );
    });
  });
});
