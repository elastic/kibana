/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { runEntityGraphTraversalHopStepDefinition } from './run_entity_graph_traversal_hop_step';
import { runEntityGraphTraversalHopInputSchema } from '../../../../common/workflow/steps/entity_graph_traversal/run_entity_graph_traversal_hop_step_common';
import {
  HOP_COUNT_COLUMN,
  HOP_SOURCE_COLUMN,
  HOP_TARGET_COLUMN,
  hopPayloadColumn,
} from './build_hop_query';

const hops = [
  {
    hop_number: 1,
    name: 'groups',
    match_field: 'entity.id',
    target_fields: [{ field: 'entity.relationships.member_of.ids', relation: 'member_of' }],
    payload_fields: ['entity.name'],
    target_type: 'group',
  },
  {
    hop_number: 2,
    name: 'roles',
    match_field: 'entity.id',
    target_fields: [{ field: 'entity.relationships.sso_to_role.ids', relation: 'sso_to_role' }],
    payload_fields: ['entity.name'],
    target_type: 'role',
  },
];
const limits = {
  max_hops: 2,
  max_nodes: 100,
  max_frontier: 10,
  max_edges_per_hop: 100,
  max_edges_total: 100,
  hub_degree: 50,
};
const SEED = 'user:john.doe@acme.com@okta';

/** An ES|QL result with one row per [source, target]. */
const result = (rows: Array<[string, string]>) => ({
  columns: [
    { name: HOP_SOURCE_COLUMN, type: 'keyword' },
    { name: HOP_TARGET_COLUMN, type: 'keyword' },
    { name: HOP_COUNT_COLUMN, type: 'long' },
    { name: hopPayloadColumn(0), type: 'keyword' },
  ],
  values: rows.map(([source, target]) => [source, target, 1, null]),
});

const createContext = (rawInput: Record<string, unknown>, rows: Array<[string, string]>) => {
  const esql = { query: jest.fn().mockResolvedValue({ ...result(rows), took: 4 }) };
  const indices = { getAlias: jest.fn().mockRejectedValue(new Error('no alias')) };
  const context = {
    input: runEntityGraphTraversalHopInputSchema.parse(rawInput),
    config: {},
    rawInput,
    contextManager: {
      getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'default' } }),
      getScopedEsClient: jest.fn().mockReturnValue({ esql, indices }),
      callKibanaApi: jest.fn().mockResolvedValue({ body: { id: 'default' } }),
      renderInputTemplate: jest.fn(),
      getFakeRequest: jest.fn(),
    },
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    stepId: 'run_hop',
    stepType: runEntityGraphTraversalHopStepDefinition.id,
  } as unknown as StepHandlerContext;
  return { context, esql, indices };
};

describe('entityStore.runEntityGraphTraversalHop', () => {
  it('starts from the seed when nothing is carried and runs the first hop', async () => {
    const { context, esql } = createContext(
      // The engine renders references to a previous output that does not exist as empty.
      {
        hop: hops[0],
        hops_executed: '',
        seed_id: SEED,
        frontier: '',
        visited: '',
        edges: '',
        nodes: '',
        until_matches: '',
        truncated_so_far: '',
        direction: 'out',
        limits,
      },
      [[SEED, 'group-1']]
    );
    const { output, error } = await runEntityGraphTraversalHopStepDefinition.handler(context);
    expect(error).toBeUndefined();
    expect(esql.query.mock.calls[0][0]).toMatchObject({ params: [SEED] });
    expect(output).toMatchObject({
      hop_number: 1,
      hop_name: 'groups',
      next_frontier: ['group-1'],
      visited: [SEED, 'group-1'],
      stop_reason: '',
    });
    expect(output?.edges.map((e) => [e.source, e.target])).toEqual([[SEED, 'group-1']]);
    expect(output?.nodes.map((n) => n.id)).toEqual(['group-1']);
    // Timings: Elasticsearch's took is passed through, and the handler adds its setup time.
    expect(output?.stats).toMatchObject({ queries: 1, es_took_ms: 4 });
    expect(output?.stats.query_ms).toBeGreaterThanOrEqual(0);
    expect(output?.stats.setup_ms).toBeGreaterThanOrEqual(0);
  });

  it('runs the next hop from the nodes the previous one admitted and appends to the carried state', async () => {
    const carriedEdge = {
      hop: 1,
      relation: 'member_of',
      source: SEED,
      target: 'group-1',
      count: 1,
    };
    const carriedNode = { id: 'group-1', hop: 1, via: 'member_of', type: 'group' };
    const { context, esql } = createContext(
      {
        hop: hops[1],
        hops_executed: 1,
        seed_id: SEED,
        edges: [carriedEdge],
        nodes: [carriedNode],
        until_matches: ['group-1'],
        truncated_so_far: false,
        direction: 'out',
        limits,
      },
      [['group-1', 'role-1']]
    );
    const { output } = await runEntityGraphTraversalHopStepDefinition.handler(context);
    // The frontier was not carried: it is the nodes admitted by hop 1.
    expect(esql.query.mock.calls[0][0]).toMatchObject({ params: ['group-1'] });
    expect(output).toMatchObject({ hop_number: 2, hop_name: 'roles' });
    expect(output?.edges.map((e) => [e.hop, e.target])).toEqual([
      [1, 'group-1'],
      [2, 'role-1'],
    ]);
    expect(output?.nodes).toEqual([
      carriedNode,
      { id: 'role-1', hop: 2, via: 'sso_to_role', type: 'role' },
    ]);
    expect(output?.until_matches).toEqual(['group-1']);
    // visited was not carried: it is the seed plus the carried nodes, plus this hop's.
    expect(output?.visited).toEqual([SEED, 'group-1', 'role-1']);
    expect(output?.edges.every((e) => !('payload' in e))).toBe(true);
  });

  it('skips the space and index lookups when the load step resolved them', async () => {
    const { context, esql, indices } = createContext(
      {
        hop: hops[0],
        seed_id: SEED,
        space_id: 'default',
        lookup_index: '.entities.v2.latest.default-00001',
        direction: 'out',
        limits,
      },
      [[SEED, 'group-1']]
    );
    const { output, error } = await runEntityGraphTraversalHopStepDefinition.handler(context);
    expect(error).toBeUndefined();
    expect(context.contextManager.callKibanaApi).not.toHaveBeenCalled();
    expect(indices.getAlias).not.toHaveBeenCalled();
    expect(esql.query.mock.calls[0][0].query).toContain(
      'LOOKUP JOIN .entities.v2.latest.default-00001 ON `entity.id`'
    );
    expect(output?.nodes.map((n) => n.id)).toEqual(['group-1']);
  });

  it('resolves the space itself when the given one is not the execution space', async () => {
    const { context } = createContext(
      { hop: hops[0], seed_id: SEED, space_id: 'other', direction: 'out', limits },
      [[SEED, 'group-1']]
    );
    // The API reports "default", which is the execution space, so the hop proceeds there.
    const { error } = await runEntityGraphTraversalHopStepDefinition.handler(context);
    expect(error).toBeUndefined();
    expect(context.contextManager.callKibanaApi).toHaveBeenCalledTimes(1);
  });

  it('expands an explicit frontier when one is given', async () => {
    const { context, esql } = createContext(
      {
        hop: hops[1],
        hops_executed: 1,
        seed_id: SEED,
        frontier: ['group-9'],
        nodes: [{ id: 'group-1', hop: 1, via: 'member_of' }],
        direction: 'out',
        limits,
      },
      []
    );
    const { error } = await runEntityGraphTraversalHopStepDefinition.handler(context);
    expect(error).toBeUndefined();
    expect(esql.query.mock.calls[0][0]).toMatchObject({ params: ['group-9'] });
  });
});
