/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIcon } from '../helpers/style_choices';
import { createMockGraphStore } from './mocks';
import { createGraphStore } from './store';
import {
  createRuntimeGraphState,
  deleteSelectedNodes,
  redoWorkspace,
  toggleNodeSelection,
  undoWorkspace,
  workspaceChanged,
  workspaceGraphMerged,
  workspaceLayoutChanged,
} from './workspace';

const createEnvironment = () => {
  const { mockedDeps } = createMockGraphStore({});
  const runtimeGraph = mockedDeps.createRuntimeGraph();
  runtimeGraph.nodes = ['first', 'second'].map((id) => ({
    id,
    x: 1,
    y: 2,
    kx: 1,
    ky: 2,
    label: id,
    color: 'black',
    scaledSize: 1,
    data: { field: 'field', term: id },
    icon: getIcon(''),
    parent: null,
    numChildren: 0,
  }));
  const store = createGraphStore(mockedDeps);
  store.dispatch(workspaceChanged(createRuntimeGraphState(runtimeGraph)));
  store.dispatch(toggleNodeSelection({ nodeId: 'first', replace: true }));
  runtimeGraph.nodes[0].x = 10;
  runtimeGraph.nodes[0].y = 20;
  runtimeGraph.nodes[1].x = 30;
  runtimeGraph.nodes[1].y = 40;
  return { store, runtimeGraph, mockedDeps };
};

describe('workspace position middleware', () => {
  it('preserves settled positions during topology edits and undo/redo', () => {
    const { store, runtimeGraph } = createEnvironment();
    const previousState = store.getState().workspace;
    store.dispatch(workspaceLayoutChanged(false));
    expect(store.getState().workspace.nodesById).toBe(previousState.nodesById);
    expect(store.getState().workspace.nodesById.second.x).toBe(1);

    store.dispatch(deleteSelectedNodes());

    expect(runtimeGraph.nodes.map(({ id, x, y }) => ({ id, x, y }))).toEqual([
      { id: 'second', x: 30, y: 40 },
    ]);
    expect(store.getState().workspace.undoHistory[0].nodesById.first).toMatchObject({
      x: 10,
      y: 20,
    });
    expect(store.getState().workspace.selectedNodeIds).toEqual([]);

    runtimeGraph.nodes[0].x = 50;
    runtimeGraph.nodes[0].y = 60;
    store.dispatch(undoWorkspace());
    expect(runtimeGraph.nodes.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]);
    expect(store.getState().workspace.selectedNodeIds).toEqual(['first']);

    store.dispatch(redoWorkspace());
    expect(runtimeGraph.nodes.map(({ id, x, y }) => ({ id, x, y }))).toEqual([
      { id: 'second', x: 50, y: 60 },
    ]);
  });

  it('captures current coordinates before recording response-merge history', () => {
    const { store } = createEnvironment();
    store.dispatch(workspaceGraphMerged({ nodes: [], edges: [] }));
    const { undoHistory, selectedNodeIds } = store.getState().workspace;
    expect(undoHistory).toHaveLength(1);
    expect(undoHistory[0].nodesById.second).toMatchObject({ x: 30, y: 40 });
    expect(selectedNodeIds).toEqual(['first']);
  });

  it('allows topology actions when no runtime graph exists', () => {
    const { store, mockedDeps } = createEnvironment();
    mockedDeps.getRuntimeGraph.mockReturnValue(undefined);
    store.dispatch(deleteSelectedNodes());
    expect(store.getState().workspace.nodeIds).toEqual(['second']);
  });
});
