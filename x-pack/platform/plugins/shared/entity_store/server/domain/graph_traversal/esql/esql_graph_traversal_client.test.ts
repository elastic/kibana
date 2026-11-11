/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { EsqlGraphTraversalClient } from './esql_graph_traversal_client';

const LOOKUP = '.entities.v2.latest.default-00001';
const field = (kind: string) => `entity.relationships.${kind}.ids`;
const SCENARIO = 'okta-user-to-aws-resources';
const SCENARIO_KINDS = [
  'member_of',
  'sso_to_role',
  'can_assume',
  'can_connect',
  'runs_as',
  'grants_access_to',
];

/** An empty walk result with the columns the mapper requires. */
const emptyWalk = {
  columns: ['node_from', 'node_to', 'entity.id', 'hop', 'relation', 'dropped', '__count'].map(
    (name) => ({ name, type: 'keyword' })
  ),
  values: [],
  took: 3,
};

const setup = (knownKinds: string[] | 'unreadable') => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.indices.getAlias.mockResolvedValue({ [LOOKUP]: { aliases: {} } } as never);
  if (knownKinds === 'unreadable') {
    esClient.fieldCaps.mockRejectedValue(new Error('no such index'));
  } else {
    esClient.fieldCaps.mockResolvedValue({
      indices: [LOOKUP],
      fields: Object.fromEntries(
        knownKinds.map((kind) => [
          field(kind),
          { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
        ])
      ),
    } as never);
  }
  esClient.esql.query.mockResolvedValue(emptyWalk as never);
  const client = new EsqlGraphTraversalClient({
    logger: loggingSystemMock.createLogger(),
    namespace: 'default',
    esClient,
  });
  const statements = () =>
    esClient.esql.query.mock.calls
      .map(([request]) => (request as { query: string }).query)
      .filter((query) => query.includes('GRAPH EXPAND'));
  return { esClient, client, statements };
};

describe('EsqlGraphTraversalClient', () => {
  it('drops relationship fields the index does not know from the array-form statement', async () => {
    const { esClient, client, statements } = setup(
      SCENARIO_KINDS.filter((kind) => kind !== 'grants_access_to')
    );
    await client.run({ scenarioId: SCENARIO, seedId: 'user:a@okta' });
    expect(esClient.fieldCaps).toHaveBeenCalledWith(
      expect.objectContaining({ fields: 'entity.relationships.*' })
    );
    const [statement] = statements();
    expect(statement).not.toContain(field('grants_access_to'));
    expect(statement).toContain(field('runs_as'));
    expect(statement).toContain('"max_hops":7');
  });

  it('ends the walk at the first hop with no known field', async () => {
    const { client, statements } = setup(['member_of']);
    const response = await client.run({ scenarioId: SCENARIO, seedId: 'user:a@okta' });
    const [statement] = statements();
    expect(statement).toContain('TO (`entity.relationships.member_of.ids`)');
    expect(statement).toContain('"max_hops":1');
    expect(response.output.hops_planned).toBe(1);
  });

  it('returns the seed alone when the first hop has no known field', async () => {
    const { client, statements } = setup([]);
    const response = await client.run({ scenarioId: SCENARIO, seedId: 'user:a@okta' });
    expect(statements()).toEqual([]);
    expect(response.output).toMatchObject({
      hops_executed: 0,
      stop_reason: 'frontier_exhausted',
      truncated: false,
      node_count: 1,
      edge_count: 0,
    });
    expect(response.output.nodes[0]).toMatchObject({ id: 'user:a@okta', hop: 0, via: 'seed' });
  });

  it('keeps every field when the fields cannot be read or over edge documents', async () => {
    const unreadable = setup('unreadable');
    await unreadable.client.run({ scenarioId: SCENARIO, seedId: 'user:a@okta' });
    expect(unreadable.statements()[0]).toContain(field('grants_access_to'));

    const edges = setup(['member_of']);
    await edges.client.run({ scenarioId: SCENARIO, seedId: 'user:a@okta', edgeDocuments: true });
    expect(edges.esClient.fieldCaps).not.toHaveBeenCalled();
    expect(edges.statements()[0]).toContain('"hop_relations"');
  });

  it('applies the run limit overrides to the statement', async () => {
    const { client, statements } = setup(SCENARIO_KINDS);
    await client.run({
      scenarioId: SCENARIO,
      seedId: 'user:a@okta',
      maxHops: 2,
      limits: { max_nodes: 10, hub_degree: 7, max_edges_total: 50 },
    });
    const [statement] = statements();
    expect(statement).toContain('"max_hops":2,"max_nodes":10,"max_frontier":250,"hub_degree":7');
    expect(statement.split('\n').at(-1)).toBe('| LIMIT 50');
  });
});
