/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConnectedFlow, type FlowEdge } from './connected_flow';

// s1 -> d1, s1 -> d2, s2 -> d2, s3 -> p -> d3, s3 -> p -> d4 (p is a mid-stream node)
const edges: FlowEdge[] = [
  { id: 's1->d1', source: 's1', target: 'd1' },
  { id: 's1->d2', source: 's1', target: 'd2' },
  { id: 's2->d2', source: 's2', target: 'd2' },
  { id: 's3->p', source: 's3', target: 'p' },
  { id: 'p->d3', source: 'p', target: 'd3' },
  { id: 'p->d4', source: 'p', target: 'd4' },
];

describe('getConnectedFlow', () => {
  it('returns an empty flow without start nodes', () => {
    const flow = getConnectedFlow([], edges);
    expect(flow.nodeIds.size).toBe(0);
    expect(flow.edgeIds.size).toBe(0);
  });

  it('includes only the start node when it has no edges', () => {
    const flow = getConnectedFlow(['lonely'], edges);
    expect([...flow.nodeIds]).toEqual(['lonely']);
    expect(flow.edgeIds.size).toBe(0);
  });

  it('collects the sources feeding a destination without sibling destinations', () => {
    const flow = getConnectedFlow(['d2'], edges);
    expect([...flow.nodeIds].sort()).toEqual(['d2', 's1', 's2']);
    expect([...flow.edgeIds].sort()).toEqual(['s1->d2', 's2->d2']);
  });

  it('collects every destination a source fans out to', () => {
    const flow = getConnectedFlow(['s1'], edges);
    expect([...flow.nodeIds].sort()).toEqual(['d1', 'd2', 's1']);
    expect([...flow.edgeIds].sort()).toEqual(['s1->d1', 's1->d2']);
  });

  it('does not cross from one branch to a sibling through a shared mid-stream node', () => {
    const flow = getConnectedFlow(['d3'], edges);
    expect([...flow.nodeIds].sort()).toEqual(['d3', 'p', 's3']);
    expect([...flow.edgeIds].sort()).toEqual(['p->d3', 's3->p']);
  });

  it('walks both directions from a mid-stream node', () => {
    const flow = getConnectedFlow(['p'], edges);
    expect([...flow.nodeIds].sort()).toEqual(['d3', 'd4', 'p', 's3']);
    expect([...flow.edgeIds].sort()).toEqual(['p->d3', 'p->d4', 's3->p']);
  });

  it('unions the flows of several start nodes', () => {
    const flow = getConnectedFlow(['d1', 'd3'], edges);
    expect([...flow.nodeIds].sort()).toEqual(['d1', 'd3', 'p', 's1', 's3']);
    expect([...flow.edgeIds].sort()).toEqual(['p->d3', 's1->d1', 's3->p']);
  });

  it('terminates on cycles', () => {
    const cyclic: FlowEdge[] = [
      { id: 'a->b', source: 'a', target: 'b' },
      { id: 'b->a', source: 'b', target: 'a' },
    ];
    const flow = getConnectedFlow(['a'], cyclic);
    expect([...flow.nodeIds].sort()).toEqual(['a', 'b']);
    expect([...flow.edgeIds].sort()).toEqual(['a->b', 'b->a']);
  });
});
