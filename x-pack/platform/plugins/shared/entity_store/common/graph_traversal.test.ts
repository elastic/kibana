/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_GRAPH_TRAVERSAL_SCENARIO_ID,
  getDefaultGraphTraversalScenarioId,
  HOST_GRAPH_TRAVERSAL_SCENARIO_ID,
  traceGraphTraversalRoutes,
} from './graph_traversal';

describe('getDefaultGraphTraversalScenarioId', () => {
  it('runs the endpoint scenario for a host seed', () => {
    expect(getDefaultGraphTraversalScenarioId('host:WKSTN-RECV01')).toBe(
      HOST_GRAPH_TRAVERSAL_SCENARIO_ID
    );
  });

  it('runs the Okta scenario for any other seed', () => {
    expect(getDefaultGraphTraversalScenarioId('user:john.doe@acmecrm.com@okta')).toBe(
      DEFAULT_GRAPH_TRAVERSAL_SCENARIO_ID
    );
    expect(getDefaultGraphTraversalScenarioId('arn:aws:iam::1:role/x')).toBe(
      DEFAULT_GRAPH_TRAVERSAL_SCENARIO_ID
    );
  });
});

describe('traceGraphTraversalRoutes', () => {
  const edges = [
    { source: 'seed', target: 'hash' },
    { source: 'host:B', target: 'hash' },
    { source: 'host:B', target: 'c2' },
    { source: 'seed', target: 'c2' },
    { source: 'host:C', target: 'hash' },
  ];

  it('walks edges in both directions and returns a shortest route per target', () => {
    expect(traceGraphTraversalRoutes('seed', edges, ['host:B', 'host:C'])).toEqual([
      { id: 'host:B', route: ['seed', 'hash', 'host:B'] },
      { id: 'host:C', route: ['seed', 'hash', 'host:C'] },
    ]);
  });

  it('skips targets the edges do not connect to the seed, and the seed itself is a one-node route', () => {
    expect(traceGraphTraversalRoutes('seed', edges, ['nowhere', 'seed'])).toEqual([
      { id: 'seed', route: ['seed'] },
    ]);
    expect(traceGraphTraversalRoutes('seed', edges, [])).toEqual([]);
  });
});
