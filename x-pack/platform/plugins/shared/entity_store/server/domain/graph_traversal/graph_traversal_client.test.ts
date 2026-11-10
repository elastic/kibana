/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { GraphTraversalClient, HOPS_GRAPH_TRAVERSAL_EXECUTION_ID } from './graph_traversal_client';
import { GraphTraversalError } from './graph_traversal_error';
import {
  HOP_COUNT_COLUMN,
  HOP_SOURCE_COLUMN,
  HOP_TARGET_COLUMN,
  hopPayloadColumn,
} from './hops/build_hop_query';
import { ENTITY_ID_FIELD } from './hops/resolve_nodes';

const SEED = 'user:john.doe@acmecrm.com@okta';
const LATEST_INDEX = '.entities.v2.latest.default-00001';

/** An ES|QL hop result with one row per [source, target]. */
const hopResult = (rows: Array<[string, string]>, took = 3) => ({
  took,
  columns: [
    { name: HOP_SOURCE_COLUMN, type: 'keyword' },
    { name: HOP_TARGET_COLUMN, type: 'keyword' },
    { name: HOP_COUNT_COLUMN, type: 'long' },
    { name: hopPayloadColumn(0), type: 'keyword' },
  ],
  values: rows.map(([source, target]) => [source, target, 1, null]),
});

/** An ES|QL resolve result naming every id it is asked for. */
const resolveResult = (ids: string[]) => ({
  took: 2,
  columns: [
    { name: ENTITY_ID_FIELD, type: 'keyword' },
    { name: 'entity.name', type: 'keyword' },
  ],
  values: ids.map((id) => [id, `name of ${id}`]),
});

/**
 * Answers each hop query from the ids it is given: the user belongs to one group, the group
 * federates to one role, the role reaches one bucket, and the bucket points nowhere.
 */
const edgesByField: Record<string, Record<string, string[]>> = {
  'entity.relationships.member_of.ids': { [SEED]: ['group-1'] },
  'entity.relationships.sso_to_role.ids': { 'group-1': ['role-1'] },
  'entity.relationships.grants_access_to.ids': { 'role-1': ['bucket-1'] },
};

const createClient = () => {
  const query = jest.fn(async ({ query: text, params }: { query: string; params: string[] }) => {
    // Hop queries expand a relationship field; the resolve query reads documents by id.
    if (!text.includes('MV_EXPAND')) {
      return resolveResult(params);
    }
    const field = Object.keys(edgesByField).find((name) => text.includes(`\`${name}\``));
    const rows: Array<[string, string]> = [];
    for (const id of params) {
      for (const target of edgesByField[field ?? '']?.[id] ?? []) rows.push([id, target]);
    }
    return hopResult(rows);
  });
  const esClient = {
    esql: { query },
    indices: { getAlias: jest.fn().mockResolvedValue({ [LATEST_INDEX]: {} }) },
  } as unknown as ElasticsearchClient;
  const client = new GraphTraversalClient({
    logger: loggingSystemMock.createLogger(),
    namespace: 'default',
    esClient,
  });
  return { client, query };
};

describe('GraphTraversalClient', () => {
  it('walks the scenario hop by hop in process and resolves the nodes once', async () => {
    const { client, query } = createClient();
    const response = await client.run({ scenarioId: 'okta-user-to-aws-resources', seedId: SEED });

    expect(response).toMatchObject({
      execution_id: HOPS_GRAPH_TRAVERSAL_EXECUTION_ID,
      engine: 'hops',
      status: 'completed',
    });
    const output = response.output!;
    // Hops 1 to 3 each reach one node; hop 4 finds nothing and exhausts the frontier.
    expect(output.hops_planned).toBe(7);
    expect(output.hops_executed).toBe(4);
    expect(output.stop_reason).toBe('frontier_exhausted');
    expect(output.edges.map((e) => [e.hop, e.relation, e.source, e.target])).toEqual([
      [1, 'member_of', SEED, 'group-1'],
      [2, 'sso_to_role', 'group-1', 'role-1'],
      [3, 'grants_access_to', 'role-1', 'bucket-1'],
    ]);
    expect(output.node_count).toBe(4);
    expect(output.nodes.map((n) => [n.id, n.hop, n.resolved, n.entity?.name])).toEqual([
      [SEED, 0, true, `name of ${SEED}`],
      ['group-1', 1, true, 'name of group-1'],
      ['role-1', 2, true, 'name of role-1'],
      ['bucket-1', 3, true, 'name of bucket-1'],
    ]);
    expect(output.edges.every((e) => !('payload' in e))).toBe(true);
    expect(output.routes).toEqual([]);

    // Hop stats and timings come from the run itself.
    expect(output.hops?.map((h) => [h.hop_number, h.queries, h.edges_added])).toEqual([
      [1, 1, 1],
      [2, 1, 1],
      [3, 4, 1],
      [4, 4, 0],
    ]);
    expect(response.timings).toMatchObject({
      es_took_ms: 10 * 3,
      resolve_nodes_ms: expect.any(Number),
    });

    // One query per field per hop, then one resolve query for the four nodes.
    const texts = query.mock.calls.map(([call]) => call.query as string);
    expect(texts.filter((t) => t.includes('MV_EXPAND'))).toHaveLength(10);
    expect(texts.filter((t) => !t.includes('MV_EXPAND'))).toHaveLength(1);
    expect(query.mock.calls.at(-1)![0].params).toEqual([SEED, 'group-1', 'role-1', 'bucket-1']);
    // Hop queries carry no payload unless a stop condition needs one, so they do not join;
    // nodes are resolved once after the walk.
    expect(texts[0]).not.toContain('LOOKUP JOIN');
  });

  it('stops at a node matching a stop condition and traces the route to it', async () => {
    const { client } = createClient();
    const response = await client.run({
      scenarioId: 'okta-user-to-aws-resources',
      seedId: SEED,
      until: [{ field: 'entity.id', values: ['role-1'] }],
    });
    const output = response.output!;
    expect(output.hops_executed).toBe(2);
    expect(output.stop_reason).toBe('until_matched');
    expect(output.until_matches).toEqual(['role-1']);
    expect(output.routes).toEqual([{ id: 'role-1', route: [SEED, 'group-1', 'role-1'] }]);
  });

  it('rejects an unknown scenario with a 400', async () => {
    const { client } = createClient();
    await expect(client.run({ scenarioId: 'no-such-scenario', seedId: SEED })).rejects.toThrow(
      GraphTraversalError
    );
  });
});
