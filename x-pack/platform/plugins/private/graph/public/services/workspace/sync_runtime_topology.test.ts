/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Workspace } from '../../types/workspace_state';
import type { WorkspaceState } from '../../state_management/workspace';
import { syncRuntimeTopology } from './sync_runtime_topology';

it('rebuilds mutable runtime references from normalized Redux topology', () => {
  const workspace = {
    runLayout: jest.fn(),
  } as unknown as Workspace;
  const state = {
    nodeIds: ['parent', 'child'],
    nodesById: {
      parent: {
        id: 'parent',
        x: 1,
        y: 2,
        label: 'Parent',
        color: 'red',
        scaledSize: 15,
        data: { field: 'f', term: 'p' },
      },
      child: {
        id: 'child',
        parentId: 'parent',
        x: 3,
        y: 4,
        label: 'Child',
        color: 'blue',
        scaledSize: 15,
        data: { field: 'f', term: 'c' },
      },
    },
    edgeIds: ['edge'],
    edgesById: {
      edge: {
        id: 'edge',
        sourceId: 'parent',
        targetId: 'child',
        topSourceId: 'parent',
        topTargetId: 'parent',
        label: '',
        weight: 1,
        width: 2,
      },
    },
  } as WorkspaceState;

  syncRuntimeTopology(workspace, state);

  expect(workspace.nodesMap.child.parent).toBe(workspace.nodesMap.parent);
  expect(workspace.edgesMap.edge.source).toBe(workspace.nodesMap.parent);
  expect(workspace.edgesMap.edge.target).toBe(workspace.nodesMap.child);
  expect(workspace.runLayout).toHaveBeenCalled();
});
