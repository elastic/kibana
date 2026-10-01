/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphState } from '../../state_management';
import type { RuntimeWorkspace, WorkspaceEdge, WorkspaceNode } from '../../types';
import { ReduxLayoutTopology } from './redux_layout_topology';

const createNode = (id: string) => ({ id } as WorkspaceNode);
const createEdge = (id: string) => ({ id } as WorkspaceEdge);

describe('ReduxLayoutTopology', () => {
  it('returns mutable runtime objects in Redux topology order', () => {
    const firstNode = createNode('first');
    const secondNode = createNode('second');
    const firstEdge = createEdge('first-edge');
    const secondEdge = createEdge('second-edge');
    const workspace = {
      nodes: [firstNode, secondNode],
      nodesMap: { first: firstNode, second: secondNode },
      edges: [firstEdge, secondEdge],
      edgesMap: { 'first-edge': firstEdge, 'second-edge': secondEdge },
    } as unknown as RuntimeWorkspace;
    const state = {
      workspace: {
        nodeIds: ['second', 'first'],
        edgeIds: ['second-edge', 'first-edge'],
      },
    } as unknown as GraphState;
    const topology = new ReduxLayoutTopology({
      getState: () => state,
      getWorkspace: () => workspace,
    });

    expect(topology.getNodes()).toEqual([secondNode, firstNode]);
    expect(topology.getEdges()).toEqual([secondEdge, firstEdge]);
  });

  it('does not expose runtime topology while Redux synchronization is pending', () => {
    const node = createNode('new-node');
    const edge = createEdge('new-edge');
    const workspace = {
      nodes: [node],
      nodesMap: { 'new-node': node },
      edges: [edge],
      edgesMap: { 'new-edge': edge },
    } as unknown as RuntimeWorkspace;
    const state = {
      workspace: { nodeIds: [], edgeIds: [] },
    } as unknown as GraphState;
    const topology = new ReduxLayoutTopology({
      getState: () => state,
      getWorkspace: () => workspace,
    });

    expect(topology.getNodes()).toEqual([]);
    expect(topology.getEdges()).toEqual([]);
  });
});
