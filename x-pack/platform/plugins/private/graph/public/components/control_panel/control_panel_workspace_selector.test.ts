/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkspaceNodeState } from '../../state_management';
import type { ControlPanelWorkspace } from './control_panel_workspace_selector';
import { areControlPanelWorkspacesEqual } from './control_panel_workspace_selector';

const createNode = (overrides: Partial<WorkspaceNodeState> = {}): WorkspaceNodeState => ({
  id: 'node-1',
  x: 10,
  y: 20,
  label: 'Node 1',
  color: '#000000',
  scaledSize: 15,
  data: { field: 'host.name', term: 'host-1' },
  ...overrides,
});

const createWorkspace = (node = createNode()): ControlPanelWorkspace => ({
  nodeIds: [node.id],
  nodesById: { [node.id]: node },
  selectedNodeIds: [node.id],
});

describe('areControlPanelWorkspacesEqual', () => {
  it('ignores coordinate-only layout updates', () => {
    const previous = createWorkspace();
    const next = createWorkspace({ ...previous.nodesById['node-1'], x: 30, y: 40 });

    expect(areControlPanelWorkspacesEqual(previous, next)).toBe(true);
  });

  it.each([
    ['label', { label: 'Updated node' }],
    ['color', { color: '#FFFFFF' }],
    ['grouping', { parentId: 'parent-node' }],
  ] as const)('detects %s changes', (_name, change) => {
    const previous = createWorkspace();
    const next = createWorkspace({ ...previous.nodesById['node-1'], ...change });

    expect(areControlPanelWorkspacesEqual(previous, next)).toBe(false);
  });

  it('detects selection changes', () => {
    const previous = createWorkspace();
    const next = { ...previous, selectedNodeIds: [] };

    expect(areControlPanelWorkspacesEqual(previous, next)).toBe(false);
  });

  it('detects topology changes', () => {
    const previous = createWorkspace();
    const next = { ...previous, nodeIds: [...previous.nodeIds, 'node-2'] };

    expect(areControlPanelWorkspacesEqual(previous, next)).toBe(false);
  });
});
