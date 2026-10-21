/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWorkspace } from '../services/workspace/graph_client_workspace';
import { getIcon } from '../helpers/style_choices';
import { createMockGraphStore } from './mocks';
import { createGraphStore, type GraphStore } from './store';
import {
  clearNodeSelection,
  colorSelectedNodes,
  createWorkspaceState,
  initializeWorkspace,
  selectNeighborNodes,
  setNodeLabel,
  toggleEdgeSelection,
  toggleNodeSelection,
  workspaceChanged,
  workspaceInitializedSelector,
} from './workspace';

const createEnvironment = () => {
  const workspace = createWorkspace({
    changeHandler: jest.fn(),
    topologyChangeHandler: () => store.dispatch(workspaceChanged(createWorkspaceState(workspace))),
  });
  const { mockedDeps } = createMockGraphStore({});
  mockedDeps.getWorkspace.mockReturnValue(workspace);
  mockedDeps.notifyReact.mockImplementation(() =>
    store.dispatch(workspaceChanged(createWorkspaceState(workspace)))
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
  workspace.nodesMap['field..first'].x = 10;
  workspace.nodesMap['field..first'].y = 20;
  workspace.nodesMap['field..second'].x = 30;
  workspace.nodesMap['field..second'].y = 40;
  return { store, workspace, graph };
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

  it('removes selected groups and their dangling edges', () => {
    const { store, workspace } = setup();
    workspace.mergeIds('field..third', 'field..second');
    store.dispatch(toggleNodeSelection({ nodeId: 'field..third', replace: true }));

    workspace.deleteSelection();

    expect(store.getState().workspace.nodeIds).toEqual(['field..first']);
    expect(store.getState().workspace.edgeIds).toEqual([]);
    expect(workspace.nodesMap['field..second']).toBeUndefined();
    expect(workspace.edges).toEqual([]);
  });

  it('moves selected nodes into the blocklist', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));

    workspace.blocklistSelection();

    expect(store.getState().workspace.nodeIds).toEqual(['field..second', 'field..third']);
    expect(store.getState().workspace.blocklistedNodeIds).toEqual(['field..first']);
    expect(store.getState().workspace.edgeIds).toEqual([]);
    expect(store.getState().workspace.selectedNodeIds).toEqual([]);
  });

  it('keeps normalized blocklisted IDs consistent when the runtime contains an existing ID', () => {
    const { store, workspace } = setup();
    const selected = workspace.nodesMap['field..first'];
    workspace.blocklistedNodes.push({ ...selected, label: 'Existing' });
    store.dispatch(setNodeLabel({ nodeId: selected.id, label: 'Selected' }));
    store.dispatch(toggleNodeSelection({ nodeId: selected.id, replace: true }));

    workspace.blocklistSelection();

    const { blocklistedNodeIds, blocklistedNodesById, nodeIds } = store.getState().workspace;
    expect(nodeIds).not.toContain(selected.id);
    expect(blocklistedNodeIds).toEqual([selected.id]);
    expect(blocklistedNodeIds).toEqual(Object.keys(blocklistedNodesById));
    expect(blocklistedNodesById[selected.id].label).toBe('Selected');
  });

  it('removes all nodes when deleting with no selection', () => {
    const { store, workspace } = setup();

    workspace.deleteSelection();

    expect(store.getState().workspace.nodeIds).toEqual([]);
    expect(store.getState().workspace.nodesById).toEqual({});
    expect(store.getState().workspace.edgeIds).toEqual([]);
  });

  it('does not blocklist nodes when there is no selection', () => {
    const { store, workspace } = setup();

    workspace.blocklistSelection();

    expect(store.getState().workspace.nodeIds).toEqual([
      'field..first',
      'field..second',
      'field..third',
    ]);
    expect(store.getState().workspace.blocklistedNodeIds).toEqual([]);
  });

  it('groups selected top-level nodes without reparenting already grouped nodes', () => {
    const { store, workspace } = setup();
    workspace.mergeIds('field..first', 'field..second');
    store.dispatch(toggleNodeSelection({ nodeId: 'field..second', replace: false }));
    store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: false }));

    workspace.groupSelections(workspace.nodesMap['field..third']);

    expect(store.getState().workspace.nodesById['field..first'].parentId).toBe('field..third');
    expect(store.getState().workspace.nodesById['field..second'].parentId).toBe('field..first');
    expect(store.getState().workspace.selectedNodeIds).toEqual(['field..third']);
    workspace.ungroup(workspace.nodesMap['field..third']);
    expect(store.getState().workspace.nodesById['field..first'].parentId).toBeUndefined();
    expect(store.getState().workspace.nodesById['field..second'].parentId).toBe('field..first');
  });

  it('removes individual and all blocklisted nodes', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));
    store.dispatch(toggleNodeSelection({ nodeId: 'field..second', replace: false }));
    const first = workspace.nodesMap['field..first'];
    workspace.blocklistSelection();

    workspace.unblockNode(first);

    expect(store.getState().workspace.blocklistedNodeIds).toEqual(['field..second']);
    expect(store.getState().workspace.blocklistedNodesById['field..first']).toBeUndefined();
    workspace.unblockAll();
    expect(store.getState().workspace.blocklistedNodeIds).toEqual([]);
    expect(store.getState().workspace.blocklistedNodesById).toEqual({});
  });

  it('undoes and redoes topology changes while publishing serializable snapshots', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));
    const historyLength = workspace.undoLog.length;
    workspace.deleteSelection();
    expect(workspace.undoLog).toHaveLength(historyLength + 1);
    expect(store.getState().workspace.nodeIds).toEqual(['field..second', 'field..third']);

    workspace.undo();
    expect(store.getState().workspace.nodeIds).toContain('field..first');
    expect(workspace.redoLog).toHaveLength(1);
    workspace.redo();
    expect(store.getState().workspace.nodeIds).not.toContain('field..first');
    const snapshot = createWorkspaceState(workspace);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('preserves history across runtime snapshots and initialization across undo and redo', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));
    workspace.deleteSelection();
    const undoLog = [...workspace.undoLog];
    store.dispatch(initializeWorkspace());
    store.dispatch(workspaceChanged(createWorkspaceState(workspace)));
    expect(workspace.undoLog).toEqual(undoLog);

    workspace.undo();
    expect(workspaceInitializedSelector(store.getState())).toBe(true);
    const redoLog = [...workspace.redoLog];
    store.dispatch(workspaceChanged(createWorkspaceState(workspace)));
    expect(workspace.redoLog).toEqual(redoLog);
    workspace.redo();
    expect(workspaceInitializedSelector(store.getState())).toBe(true);
  });

  it('preserves presentation, coordinates and surviving node identities through deletion and undo/redo', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));
    store.dispatch(toggleEdgeSelection(store.getState().workspace.edgeIds[0]));
    const originalIcon = workspace.nodesMap['field..first'].icon;
    const remainingNode = workspace.nodesMap['field..second'];
    store.dispatch(setNodeLabel({ nodeId: 'field..first', label: 'Custom label' }));
    store.dispatch(colorSelectedNodes('red'));
    workspace.deleteSelection();
    expect(workspace.nodesMap['field..first']).toBeUndefined();
    expect(workspace.edges).toHaveLength(0);
    expect(workspace.nodesMap['field..second']).toBe(remainingNode);
    expect(remainingNode).toMatchObject({ x: 30, y: 40 });

    remainingNode.x = 50;
    workspace.undo();
    expect(workspace.nodesMap['field..first']).toMatchObject({
      x: 10,
      y: 20,
      label: 'Custom label',
      color: 'red',
      icon: originalIcon,
    });
    expect(workspace.edges[0]).toMatchObject({ weight: 5, width: 3, doc_count: 7 });
    workspace.redo();
    expect(workspace.nodesMap['field..second'].x).toBe(50);
  });

  it('projects grouping, merging and ungrouping, including visible edge endpoints', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..second', replace: true }));
    store.dispatch(toggleNodeSelection({ nodeId: 'field..third', replace: false }));
    workspace.groupSelections(workspace.nodesMap['field..third']);
    expect(workspace.nodesMap['field..second'].parent?.id).toBe('field..third');
    expect(workspace.edges[0].topTarget.id).toBe('field..third');
    store.dispatch(selectNeighborNodes());
    expect(store.getState().workspace.selectedNodeIds).toContain('field..first');
    workspace.ungroup(workspace.nodesMap['field..third']);
    expect(workspace.nodesMap['field..second'].parent).toBeUndefined();
    workspace.mergeIds('field..first', 'field..second');
    expect(workspace.nodesMap['field..second'].parent?.id).toBe('field..first');
    workspace.undo();
    expect(workspace.nodesMap['field..second'].parent).toBeUndefined();
  });

  it('preserves grouped styling for descendants without styling unselected nodes', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..second', replace: true }));
    workspace.groupSelections(workspace.nodesMap['field..third']);
    store.dispatch(colorSelectedNodes('green'));
    expect(workspace.nodesMap['field..second'].color).toBe('green');
    expect(workspace.nodesMap['field..third'].color).toBe('green');
    expect(store.getState().workspace.nodesById['field..second'].color).toBe('green');
    expect(workspace.nodesMap['field..first'].color).toBe('blue');
    store.dispatch(clearNodeSelection());
    store.dispatch(colorSelectedNodes('red'));
    expect(workspace.nodesMap['field..third'].color).toBe('green');
  });

  it('publishes grouped edge endpoints in normalized snapshots after layout', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..second', replace: true }));
    workspace.groupSelections(workspace.nodesMap['field..third']);
    const { edgeIds, edgesById } = store.getState().workspace;
    expect(edgesById[edgeIds[0]].topTargetId).toBe('field..third');
    workspace.undo();
    expect(store.getState().workspace.edgesById[edgeIds[0]].topTargetId).toBe('field..second');
  });

  it('publishes blocklist changes without removing unrelated nodes', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));
    workspace.blocklistSelection();
    expect(workspace.blocklistedNodes.map(({ data }) => data.term)).toEqual(['first']);
    expect(workspace.nodesMap['field..second']).toBeDefined();
    workspace.unblockNode(workspace.blocklistedNodes[0]);
    expect(workspace.blocklistedNodes).toEqual([]);
    expect(store.getState().workspace.blocklistedNodeIds).toEqual([]);
  });

  it('records response merges and preserves settled positions through merge undo/redo', () => {
    const { workspace, graph } = setup();
    const historyLength = workspace.undoLog.length;
    workspace.mergeGraph({ nodes: [{ ...graph.nodes[0], term: 'new', label: 'new' }], edges: [] });
    expect(workspace.undoLog).toHaveLength(historyLength + 1);
    workspace.undo();
    expect(workspace.nodesMap['field..new']).toBeUndefined();
    expect(workspace.nodesMap['field..second'].x).toBe(30);
    workspace.redo();
    expect(workspace.nodesMap['field..new']).toBeDefined();
  });

  it('clears topology, selections, blocklists and history when clearing the workspace', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));
    workspace.blocklistSelection();
    workspace.undo();
    expect(workspace.redoLog).toHaveLength(1);

    workspace.clearGraph();

    expect(workspace.nodes).toEqual([]);
    expect(workspace.edges).toEqual([]);
    expect(workspace.blocklistedNodes).toEqual([]);
    expect(workspace.selectedNodes).toEqual([]);
    expect(workspace.getEdgeSelection()).toEqual([]);
    expect(workspace.undoLog).toEqual([]);
    expect(workspace.redoLog).toEqual([]);
  });

  it('bounds undo history and discards redo after a new edit', () => {
    const { workspace } = setup();
    for (let index = 0; index < 55; index++) {
      if (index % 2 === 0) {
        workspace.mergeIds('field..first', 'field..second');
      } else {
        workspace.ungroup(workspace.nodesMap['field..first']);
      }
    }
    expect(workspace.undoLog).toHaveLength(50);
    workspace.undo();
    expect(workspace.redoLog).toHaveLength(1);
    workspace.deleteSelection();
    expect(workspace.redoLog).toEqual([]);
  });
});
