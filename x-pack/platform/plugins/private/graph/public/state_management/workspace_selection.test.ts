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
  invertNodeSelection,
  selectAllNodes,
  selectNeighborNodes,
  setNodeLabel,
  toggleEdgeSelection,
  toggleNodeSelection,
  workspaceChanged,
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
    edges: [{ source: 0, target: 1, weight: 5, width: 3 }],
  });
  workspace.stopLayout();
  return { store, workspace };
};

describe('Redux selection and styling with the legacy workspace', () => {
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

  it('projects Redux selection into the arrays and flags consumed by legacy workflows', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));
    expect(workspace.selectedNodes.map(({ id }) => id)).toEqual(['field..first']);
    expect(workspace.nodesMap['field..first'].isSelected).toBe(true);
    store.dispatch(selectNeighborNodes());
    expect(workspace.selectedNodes.map(({ id }) => id)).toEqual(['field..first', 'field..second']);
    store.dispatch(invertNodeSelection());
    expect(workspace.selectedNodes.map(({ id }) => id)).toEqual(['field..third']);
    store.dispatch(selectAllNodes());
    expect(workspace.selectedNodes).toHaveLength(3);
    store.dispatch(clearNodeSelection());
    expect(workspace.selectedNodes).toEqual([]);
    expect(workspace.nodes.every(({ isSelected }) => !isSelected)).toBe(true);
    store.dispatch(toggleEdgeSelection(store.getState().workspace.edgeIds[0]));
    expect(workspace.getEdgeSelection()).toEqual([workspace.edges[0]]);
    expect(workspace.edges[0].isSelected).toBe(true);
    store.dispatch(toggleEdgeSelection(store.getState().workspace.edgeIds[0]));
    expect(workspace.getEdgeSelection()).toEqual([]);
  });

  it('keeps grouped selection and descendant styling consistent after legacy grouping', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..second', replace: true }));
    workspace.groupSelections(workspace.nodesMap['field..third']);
    expect(store.getState().workspace.selectedNodeIds).toEqual(['field..third']);
    expect(store.getState().workspace.nodesById['field..second'].parentId).toBe('field..third');
    store.dispatch(colorSelectedNodes('green'));
    store.dispatch(setNodeLabel({ nodeId: 'field..third', label: 'Group' }));
    expect(workspace.nodesMap['field..third']).toMatchObject({ color: 'green', label: 'Group' });
    expect(workspace.nodesMap['field..second'].color).toBe('green');
    expect(workspace.nodesMap['field..first'].color).toBe('blue');
    store.dispatch(clearNodeSelection());
    store.dispatch(colorSelectedNodes('red'));
    expect(workspace.nodesMap['field..third'].color).toBe('green');
    workspace.ungroup(workspace.nodesMap['field..third']);
    expect(store.getState().workspace.nodesById['field..second'].parentId).toBeUndefined();
  });

  it('retains legacy removal and undo/redo while refreshing Redux selection snapshots', () => {
    const { store, workspace } = setup();
    store.dispatch(toggleNodeSelection({ nodeId: 'field..first', replace: true }));
    store.dispatch(toggleEdgeSelection(store.getState().workspace.edgeIds[0]));
    workspace.deleteSelection();
    expect(store.getState().workspace.nodeIds).toEqual(['field..second', 'field..third']);
    expect(store.getState().workspace.selectedNodeIds).toEqual([]);
    expect(store.getState().workspace.selectedEdgeIds).toEqual([]);
    workspace.undo();
    expect(store.getState().workspace.nodeIds).toContain('field..first');
    workspace.redo();
    expect(store.getState().workspace.nodeIds).not.toContain('field..first');
    expect(store.getState().workspace).not.toHaveProperty('undoHistory');
  });

  it('refreshes snapshots after legacy merges, blocklisting, and unblocking', () => {
    const { store, workspace } = setup();
    workspace.mergeIds('field..third', 'field..second');
    expect(store.getState().workspace.nodesById['field..second'].parentId).toBe('field..third');
    store.dispatch(toggleNodeSelection({ nodeId: 'field..third', replace: true }));
    workspace.blocklistSelection();
    expect(store.getState().workspace.blocklistedNodeIds).toContain('field..third');
    expect(store.getState().workspace.selectedNodeIds).toEqual([]);
    workspace.unblockNode(workspace.blocklistedNodes[0]);
    expect(store.getState().workspace.blocklistedNodeIds).not.toContain('field..third');
    workspace.unblockAll();
    expect(store.getState().workspace.blocklistedNodeIds).toEqual([]);
  });
});
