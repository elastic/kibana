/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkspaceEdge, WorkspaceNode } from '../../types/workspace_state';
import { isTopLevelNode, unpackGroupedNodes } from './runtime_grouping';

it.each([null, undefined])('treats a %s parent as top-level', (parent) => {
  expect(isTopLevelNode({ parent } as WorkspaceNode)).toBe(true);
});

it('does not treat a grouped node as top-level', () => {
  expect(isTopLevelNode({ parent: {} } as WorkspaceNode)).toBe(false);
});

it('expands grouped runtime nodes without following a null parent', () => {
  const parent = { id: 'parent', parent: null } as WorkspaceNode;
  const child = { id: 'child', parent } as WorkspaceNode;
  const edge = {
    source: child,
    target: parent,
    topSrc: parent,
    topTarget: parent,
  } as WorkspaceEdge;

  expect(unpackGroupedNodes([parent], [edge])).toEqual([parent, child]);
});
