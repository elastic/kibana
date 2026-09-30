/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { makeEdgeId, makeNodeId, prepareIncomingNodes } from './graph_merge_planner';

describe('graph merge planner', () => {
  it('creates stable node and edge IDs', () => {
    expect(makeNodeId('user', 'alice')).toBe('user..alice');
    expect(makeEdgeId('user..alice', 'host..server-1')).toBe('host..server-1->user..alice');
    expect(makeEdgeId('host..server-1', 'user..alice')).toBe('host..server-1->user..alice');
  });

  it('normalizes incoming nodes without mutating input and filters existing IDs', () => {
    const nodes = [
      { field: 'user', term: 'alice' },
      { field: 'host', term: 'server-1', label: 'Production server' },
    ];

    const result = prepareIncomingNodes(nodes, new Set(['user..alice']));

    expect(result.normalizedNodes).toEqual([
      { field: 'user', term: 'alice', id: 'user..alice', label: 'alice' },
      {
        field: 'host',
        term: 'server-1',
        id: 'host..server-1',
        label: 'Production server',
      },
    ]);
    expect(result.newNodes).toEqual([result.normalizedNodes[1]]);
    expect(nodes).toEqual([
      { field: 'user', term: 'alice' },
      { field: 'host', term: 'server-1', label: 'Production server' },
    ]);
  });
});
