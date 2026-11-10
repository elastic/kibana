/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TraversalHop,
  TraversalLimits,
} from '../../../../common/workflow/steps/entity_graph_traversal/entity_graph_traversal_common';
import {
  HOP_COUNT_COLUMN,
  HOP_SOURCE_COLUMN,
  HOP_TARGET_COLUMN,
  hopPayloadColumn,
} from './build_hop_query';
import { runHop, type EsqlResult, type ExecuteHopQuery } from './run_hop';

const hop: TraversalHop = {
  hop_number: 1,
  name: 'assets',
  match_field: 'entity.id',
  target_fields: [
    { field: 'rel.can_assume', relation: 'can_assume' },
    { field: 'rel.runs_as', relation: 'runs_as' },
  ],
  payload_fields: ['entity.name'],
  target_type: 'asset',
};

const INDEX = '.entities.v2.latest.default-*';
const LOOKUP = '.entities.v2.latest.default-00001';

const limits: TraversalLimits = {
  max_hops: 6,
  max_nodes: 100,
  max_frontier: 10,
  max_edges_per_hop: 100,
  max_edges_total: 100,
  hub_degree: 50,
};

/** Build an ES|QL-shaped result: rows of [source, target, count, payload]. */
const result = (rows: Array<[string, string, number?, unknown?]>): EsqlResult => ({
  columns: [
    { name: HOP_SOURCE_COLUMN, type: 'keyword' },
    { name: HOP_TARGET_COLUMN, type: 'keyword' },
    { name: HOP_COUNT_COLUMN, type: 'long' },
    { name: hopPayloadColumn(0), type: 'keyword' },
  ],
  values: rows.map(([source, target, count = 1, payload = null]) => [
    source,
    target,
    count,
    payload,
  ]),
});

/** One canned result per target field, in target_fields order; records each query's text, params and LIMIT. */
const executor = (
  perField: EsqlResult[]
): ExecuteHopQuery & { calls: string[][]; queries: string[]; queryLimits: number[] } => {
  const calls: string[][] = [];
  const queries: string[] = [];
  const queryLimits: number[] = [];
  let i = 0;
  const execute = async ({ query, params }: { query: string; params: string[] }) => {
    calls.push(params);
    queries.push(query);
    queryLimits.push(Number(query.match(/\| LIMIT (\d+)$/)?.[1]));
    return perField[i++] ?? result([]);
  };
  return Object.assign(execute, { calls, queries, queryLimits });
};

describe('runHop', () => {
  it('removes excluded entity ids from the frontier and excluded targets from the edges', async () => {
    const execute = executor([
      result([
        ['role-a', 'role-b'],
        ['role-a', 'role-x'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['role-a', 'role-x'],
        visited: ['seed', 'role-a', 'role-x'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
        exclusions: [
          { field: 'entity.id', values: ['role-x'] },
          { field: 'cloud.account.id', values: ['1'] },
        ],
      },
      execute
    );
    // role-x is not expanded; both exclusions also travel as document filter parameters.
    expect(execute.calls).toEqual([
      ['role-a', 'role-x', '1'],
      ['role-a', 'role-x', '1'],
    ]);
    expect(out.edges.map((edge) => edge.target)).toEqual(['role-b']);
    expect(out.nodes.map((node) => node.id)).toEqual(['role-b']);
    expect(out.stats).toMatchObject({
      frontier_size: 2,
      frontier_expanded: 1,
      excluded_frontier: 1,
      excluded_edges: 1,
      edges_added: 1,
    });
  });

  it('expands the frontier, returns edges and new nodes, and reports a continuing run', async () => {
    const execute = executor([
      result([
        ['role-a', 'role-b', 3, 'Role A'],
        ['role-a', 'role-c', 1, ['Role A', 'alias']],
      ]),
      result([['role-a', 'i-1', 2, 'Role A']]),
    ]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['role-a'],
        visited: ['seed', 'role-a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(execute.calls).toEqual([['role-a'], ['role-a']]);
    expect(out.edges).toEqual([
      {
        hop: 1,
        relation: 'can_assume',
        source: 'role-a',
        target: 'role-b',
        count: 3,
        payload: { 'entity.name': ['Role A'] },
      },
      {
        hop: 1,
        relation: 'can_assume',
        source: 'role-a',
        target: 'role-c',
        count: 1,
        payload: { 'entity.name': ['Role A', 'alias'] },
      },
      {
        hop: 1,
        relation: 'runs_as',
        source: 'role-a',
        target: 'i-1',
        count: 2,
        payload: { 'entity.name': ['Role A'] },
      },
    ]);
    expect(out.nodes).toEqual([
      { id: 'role-b', hop: 1, via: 'can_assume', type: 'asset' },
      { id: 'role-c', hop: 1, via: 'can_assume', type: 'asset' },
      { id: 'i-1', hop: 1, via: 'runs_as', type: 'asset' },
    ]);
    expect(out.next_frontier).toEqual(['role-b', 'role-c', 'i-1']);
    expect(out.visited).toEqual(['seed', 'role-a', 'role-b', 'role-c', 'i-1']);
    expect(out.truncated).toBe(false);
    expect(out.stop_reason).toBe('');
    expect(out.stats).toMatchObject({ queries: 2, rows_returned: 3, edges_added: 3, new_nodes: 3 });
  });

  it('returns nodes unresolved and the payload of the reached node when a lookup index is given', async () => {
    const execute = executor([
      result([
        ['role-a', 'role-b', 1, 'Role B'],
        ['role-a', 'ghost', 1, null],
      ]),
      result([]),
    ]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        lookupIndex: LOOKUP,
        direction: 'out',
        frontier: ['role-a'],
        visited: ['role-a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    // The loop carries the nodes, so they stay id, hop, via and type; the workflow resolves
    // them once after the traversal.
    expect(out.nodes).toEqual([
      { id: 'role-b', hop: 1, via: 'can_assume', type: 'asset' },
      { id: 'ghost', hop: 1, via: 'can_assume', type: 'asset' },
    ]);
    // The payload describes the reached node, so a stop condition on it matches it.
    expect(out.edges[0].payload).toEqual({ 'entity.name': ['Role B'] });
    expect(out.edges[1].payload).toBeUndefined();
  });

  it('caps each query at the smaller of max_edges_per_hop and the edge budget still unfilled', async () => {
    const execute = executor([
      result([
        ['role-a', 'role-b'],
        ['role-a', 'role-c'],
      ]),
      result([['role-a', 'i-1']]),
    ]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['role-a'],
        visited: ['role-a'],
        edgesSoFar: 95,
        truncatedSoFar: false,
        limits: { ...limits, max_edges_per_hop: 4 },
      },
      execute
    );
    // Five edges may still be admitted, so the first query takes the per-hop cap of four; it
    // returns two, so the second query is limited to the three left.
    expect(execute.queryLimits).toEqual([4, 3]);
    expect(out.edges.map((e) => e.target)).toEqual(['role-b', 'role-c', 'i-1']);
    expect(out.stats).toMatchObject({ queries: 2, queries_skipped: 0, edges_added: 3 });
    expect(out.truncated).toBe(false);
    expect(out.stop_reason).toBe('');
  });

  it('stops issuing queries once the collected edges fill the remaining edge budget', async () => {
    const execute = executor([
      result([
        ['role-a', 'role-b'],
        ['role-a', 'role-c'],
        ['role-a', 'role-c'],
      ]),
      result([['role-a', 'i-1']]),
    ]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['role-a'],
        visited: ['role-a'],
        edgesSoFar: 98,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    // Two distinct edges fill the budget of two, so the runs_as query is never sent.
    expect(execute.calls).toHaveLength(1);
    expect(out.edges.map((e) => e.target)).toEqual(['role-b', 'role-c']);
    expect(out.stats).toMatchObject({ queries: 1, queries_skipped: 1, edges_added: 2 });
    expect(out.truncated).toBe(true);
    expect(out.stop_reason).toBe('max_edges_total');
  });

  it('keeps closing edges onto visited nodes without re-admitting them', async () => {
    const execute = executor([
      result([
        ['role-a', 'seed'],
        ['role-a', 'role-b'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['role-a'],
        visited: ['seed', 'role-a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(out.edges.map((e) => e.target)).toEqual(['seed', 'role-b']);
    expect(out.next_frontier).toEqual(['role-b']);
    expect(out.stats.closing_edges).toBe(1);
  });

  it('drops rows whose source is not in the frontier', async () => {
    const execute = executor([
      result([
        ['other', 'x'],
        ['role-a', 'y'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['role-a'],
        visited: ['role-a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(out.edges.map((e) => e.target)).toEqual(['y']);
  });

  it('stops with frontier_exhausted when nothing new is reached', async () => {
    const execute = executor([result([]), result([])]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['role-a'],
        visited: ['role-a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(out.stop_reason).toBe('frontier_exhausted');
    expect(out.next_frontier).toEqual([]);
  });

  it('stops without querying when the frontier is empty', async () => {
    const execute = executor([]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: [],
        visited: ['seed'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(execute.calls).toEqual([]);
    expect(out.stop_reason).toBe('frontier_exhausted');
  });

  it('caps the frontier at max_frontier and marks the run truncated', async () => {
    const execute = executor([result([]), result([])]);
    const frontier = Array.from({ length: 15 }, (_, i) => `n${i}`);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier,
        visited: frontier,
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(execute.calls[0]).toHaveLength(10);
    expect(out.truncated).toBe(true);
    expect(out.stats).toMatchObject({
      frontier_size: 15,
      frontier_expanded: 10,
      dropped_frontier: 5,
    });
  });

  it('stops before querying when the node budget is already spent', async () => {
    const execute = executor([]);
    const visited = Array.from({ length: limits.max_nodes }, (_, i) => `n${i}`);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['n0'],
        visited,
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(execute.calls).toEqual([]);
    expect(out.stop_reason).toBe('max_nodes');
    expect(out.truncated).toBe(true);
  });

  it('stops before querying when the edge budget is already spent', async () => {
    const execute = executor([]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['a'],
        visited: ['a'],
        edgesSoFar: limits.max_edges_total,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(execute.calls).toEqual([]);
    expect(out.stop_reason).toBe('max_edges_total');
  });

  it('admits only as many new nodes as the budget allows', async () => {
    const execute = executor([
      result([
        ['a', 'b'],
        ['a', 'c'],
        ['a', 'd'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['a'],
        visited: ['a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits: { ...limits, max_nodes: 3 },
      },
      execute
    );
    expect(out.edges).toHaveLength(3);
    expect(out.next_frontier).toEqual(['b', 'c']);
    expect(out.stop_reason).toBe('max_nodes');
    expect(out.truncated).toBe(true);
  });

  it('keeps only as many edges as the total budget allows', async () => {
    const execute = executor([
      result([
        ['a', 'b'],
        ['a', 'c'],
        ['a', 'd'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['a'],
        visited: ['a'],
        edgesSoFar: 98,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(out.edges.map((e) => e.target)).toEqual(['b', 'c']);
    expect(out.stats.dropped_edges).toBe(1);
    expect(out.stop_reason).toBe('max_edges_total');
    expect(out.truncated).toBe(true);
  });

  it('skips hub sources with more distinct targets than hub_degree', async () => {
    const hubRows: Array<[string, string]> = Array.from({ length: 4 }, (_, i) => ['hub', `t${i}`]);
    const execute = executor([result([...hubRows, ['small', 'u']]), result([])]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['hub', 'small'],
        visited: ['hub', 'small'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits: { ...limits, hub_degree: 3 },
      },
      execute
    );
    expect(out.edges.map((e) => `${e.source}->${e.target}`)).toEqual(['small->u']);
    expect(out.stats.hubs_skipped).toEqual(['hub']);
    expect(out.truncated).toBe(true);
    expect(out.stop_reason).toBe('');
  });

  it('marks the run truncated when a query returns a full page', async () => {
    const rows: Array<[string, string]> = Array.from({ length: 5 }, (_, i) => ['a', `t${i}`]);
    const execute = executor([result(rows), result([])]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['a'],
        visited: ['a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits: { ...limits, max_edges_per_hop: 5 },
      },
      execute
    );
    expect(out.truncated).toBe(true);
    expect(out.stop_reason).toBe('');
  });

  it('carries an earlier truncation forward and deduplicates repeated edges', async () => {
    const execute = executor([
      result([
        ['a', 'b'],
        ['a', 'b'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['a', 'a'],
        visited: ['a'],
        edgesSoFar: 0,
        truncatedSoFar: true,
        limits,
      },
      execute
    );
    expect(out.edges).toHaveLength(1);
    expect(out.truncated).toBe(true);
    expect(out.stats.frontier_size).toBe(1);
  });

  it('walks both directions: an inbound leg per field reaches the holders of the relationship', async () => {
    const execute = executor([
      // outbound can_assume, outbound runs_as, inbound can_assume, inbound runs_as
      result([['hash-1', 'x']]),
      result([]),
      result([
        ['host:SRV-DC01', 'hash-1', 1, 'SRV-DC01'],
        ['host:WIN-FIN-03', 'hash-1', 1, 'WIN-FIN-03'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      {
        hop: { ...hop, source_type: 'host', target_type: 'indicator' },
        index: INDEX,
        direction: 'both',
        frontier: ['hash-1'],
        visited: ['host:WKSTN-RECV01', 'hash-1'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(execute.calls).toEqual([['hash-1'], ['hash-1'], ['hash-1'], ['hash-1']]);
    expect(out.stats.queries).toBe(4);
    // Edges keep the stored orientation: the host holds the relationship to the hash.
    expect(out.edges.map((e) => [e.source, e.target, e.relation])).toEqual([
      ['hash-1', 'x', 'can_assume'],
      ['host:SRV-DC01', 'hash-1', 'can_assume'],
      ['host:WIN-FIN-03', 'hash-1', 'can_assume'],
    ]);
    // Nodes reached on the inbound leg are the holders, typed as the hop's source type.
    expect(out.nodes.map((n) => [n.id, n.type, n.via])).toEqual([
      ['x', 'indicator', 'can_assume'],
      ['host:SRV-DC01', 'host', 'can_assume'],
      ['host:WIN-FIN-03', 'host', 'can_assume'],
    ]);
  });

  it('drops repeats of edges already recorded from the other side in a both walk', async () => {
    const execute = executor([
      // outbound from hash-1 finds nothing; inbound finds the seed host again and a new host
      result([]),
      result([]),
      result([
        ['host:WKSTN-RECV01', 'hash-1'],
        ['host:WIN-FIN-03', 'hash-1'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'both',
        frontier: ['hash-1'],
        visited: ['host:WKSTN-RECV01', 'hash-1'],
        edgesSoFar: 1,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(out.edges.map((e) => e.source)).toEqual(['host:WIN-FIN-03']);
    expect(out.nodes.map((n) => n.id)).toEqual(['host:WIN-FIN-03']);
    expect(out.stats.closing_edges).toBe(0);
  });

  it('counts hub degree by the frontier node whichever end it is on, and drops rows whose frontier end is unknown', async () => {
    const execute = executor([
      result([]),
      result([]),
      result([
        ['holder-1', 'hash-1'],
        ['holder-2', 'hash-1'],
        ['holder-3', 'hash-1'],
        ['holder-4', 'not-in-frontier'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'both',
        frontier: ['hash-1'],
        visited: ['hash-1'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits: { ...limits, hub_degree: 2 },
      },
      execute
    );
    expect(out.stats.hubs_skipped).toEqual(['hash-1']);
    expect(out.edges).toEqual([]);
    expect(out.truncated).toBe(true);
  });

  it('drops edges whose source is an excluded node as well as those whose target is', async () => {
    const execute = executor([
      result([]),
      result([]),
      result([
        ['host:excluded', 'hash-1'],
        ['host:kept', 'hash-1'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'both',
        frontier: ['hash-1'],
        visited: ['hash-1'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
        exclusions: [{ field: 'entity.id', values: ['host:excluded'] }],
      },
      execute
    );
    expect(out.edges.map((e) => e.source)).toEqual(['host:kept']);
    expect(out.nodes.map((n) => n.id)).toEqual(['host:kept']);
    expect(out.stats.excluded_edges).toBe(1);
  });

  it('ends the traversal when a hop admits a node matching a stop condition, by id or by payload', async () => {
    const execute = executor([
      result([
        ['role-a', 'bucket-1', 1, 'acme-data-lake'],
        ['role-a', 'role-b', 1, 'other'],
      ]),
      result([]),
    ]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['role-a'],
        visited: ['role-a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
        until: [
          { field: 'entity.id', values: ['bucket-1'] },
          { field: 'entity.name', values: ['other'] },
        ],
      },
      execute
    );
    // The whole hop is kept: both nodes are admitted, both matched, and nothing follows.
    expect(out.nodes.map((n) => n.id)).toEqual(['bucket-1', 'role-b']);
    expect(out.until_matches).toEqual(['bucket-1', 'role-b']);
    expect(out.stop_reason).toBe('until_matched');
    expect(out.stats.until_matched).toBe(2);
  });

  it('reads the field a stop condition names as payload even when the hop does not list it', async () => {
    // The hop's payload is entity.name only; the condition is on asset.criticality.
    const withCriticality: EsqlResult = {
      columns: [
        { name: HOP_SOURCE_COLUMN, type: 'keyword' },
        { name: HOP_TARGET_COLUMN, type: 'keyword' },
        { name: HOP_COUNT_COLUMN, type: 'long' },
        { name: hopPayloadColumn(0), type: 'keyword' },
        { name: hopPayloadColumn(1), type: 'keyword' },
      ],
      values: [
        ['role-a', 'bucket-1', 1, 'acme-data-lake', 'extreme_impact'],
        ['role-a', 'role-b', 1, 'other', 'low_impact'],
      ],
    };
    const execute = executor([withCriticality, result([])]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['role-a'],
        visited: ['role-a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
        until: [{ field: 'asset.criticality', values: ['extreme_impact'] }],
      },
      execute
    );
    // Every query of the hop reads the extra field, after the scenario's own payload fields.
    for (const query of execute.queries) {
      expect(query).toContain(
        '__payload_0 = VALUES(`entity.name`), __payload_1 = VALUES(`asset.criticality`)'
      );
    }
    expect(out.until_matches).toEqual(['bucket-1']);
    expect(out.stop_reason).toBe('until_matched');
    // The input hop is not mutated.
    expect(hop.payload_fields).toEqual(['entity.name']);
  });

  it('reports the time its queries took, round trip and as Elasticsearch measured it', async () => {
    const execute = executor([
      { ...result([['role-a', 'role-b']]), took: 7 },
      { ...result([]), took: 5 },
    ]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['role-a'],
        visited: ['role-a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(out.stats.queries).toBe(2);
    expect(out.stats.es_took_ms).toBe(12);
    expect(out.stats.query_ms).toBeGreaterThanOrEqual(0);
    // Setup happens in the step handler, outside runHop.
    expect(out.stats.setup_ms).toBe(0);
  });

  it('counts no Elasticsearch time for a response that does not report took', async () => {
    const execute = executor([result([['role-a', 'role-b']]), result([])]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['role-a'],
        visited: ['role-a'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
      },
      execute
    );
    expect(out.stats.es_took_ms).toBe(0);
  });

  it('does not stop on a closing edge to a node admitted earlier', async () => {
    const execute = executor([result([['role-a', 'role-x']]), result([])]);
    const out = await runHop(
      {
        hop,
        index: INDEX,
        direction: 'out',
        frontier: ['role-a'],
        visited: ['role-a', 'role-x'],
        edgesSoFar: 0,
        truncatedSoFar: false,
        limits,
        until: [{ field: 'entity.id', values: ['role-x'] }],
      },
      execute
    );
    expect(out.until_matches).toEqual([]);
    expect(out.stop_reason).toBe('frontier_exhausted');
  });
});
