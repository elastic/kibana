/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkspaceEdge, WorkspaceNode } from '../../types/workspace_state';
import { unpackGroupedNodes } from './runtime_grouping';

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
