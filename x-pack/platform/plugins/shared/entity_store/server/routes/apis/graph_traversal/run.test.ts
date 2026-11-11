/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS } from '../../../../common/graph_traversal/scenarios';
import { runGraphTraversalBodySchema } from './run';

describe('runGraphTraversalBodySchema', () => {
  const body = (extra: Record<string, unknown>) => ({ entity_id: 'user:a@okta', ...extra });

  it('accepts limit overrides up to the hard limits', () => {
    const parsed = runGraphTraversalBodySchema.parse(
      body({
        max_hops: ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS.max_hops,
        limits: {
          max_nodes: ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS.max_nodes,
          max_frontier: 10,
          max_edges_per_hop: ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS.max_edges_per_hop,
          max_edges_total: 3000,
          hub_degree: 1,
        },
      })
    );
    expect(parsed.limits).toEqual({
      max_nodes: 5000,
      max_frontier: 10,
      max_edges_per_hop: 5000,
      max_edges_total: 3000,
      hub_degree: 1,
    });
    expect(runGraphTraversalBodySchema.parse(body({ limits: {} })).limits).toEqual({});
    expect(runGraphTraversalBodySchema.parse(body({})).limits).toBeUndefined();
  });

  it('rejects a limit above its hard limit or below one', () => {
    for (const limits of [
      { max_nodes: ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS.max_nodes + 1 },
      { max_frontier: ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS.max_frontier + 1 },
      { max_edges_per_hop: ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS.max_edges_per_hop + 1 },
      { max_edges_total: ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS.max_edges_total + 1 },
      { hub_degree: ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS.hub_degree + 1 },
      { hub_degree: 0 },
      { max_nodes: 1.5 },
    ]) {
      expect(runGraphTraversalBodySchema.safeParse(body({ limits })).success).toBe(false);
    }
    expect(
      runGraphTraversalBodySchema.safeParse(
        body({ max_hops: ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS.max_hops + 1 })
      ).success
    ).toBe(false);
  });
});
