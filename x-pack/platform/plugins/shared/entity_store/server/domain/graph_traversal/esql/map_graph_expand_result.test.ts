/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadEntityGraphTraversalPlan } from '../../../../common/graph_traversal/scenarios';
import type { GraphTraversalNode } from '../../../../common/graph_traversal';
import { buildGraphExpandStatement } from './build_graph_expand';
import { mapGraphExpandResult, readEntity, type EsqlResult } from './map_graph_expand_result';

const HASH = 'a3f5c9d1e8b74620fa1c0d5e2b9847361c0ded4488ab2f0e9a7c6b5d4e3f2a10';
const INDEX = '.entities.v2.latest.default-*';
const LOOKUP = '.entities.v2.latest.default-00001';
const EXECUTED = 'entity.relationships.executed.ids';
const CONNECTED = 'entity.relationships.connected_to.ids';

const plan = loadEntityGraphTraversalPlan('endpoint-shared-indicator-spread');
if (!plan) throw new Error('scenario missing');
const seed: GraphTraversalNode = { id: 'host:WKSTN-RECV01', hop: 0, via: 'seed', type: 'host' };

const columns = [
  'node_from',
  'node_to',
  'entity.id',
  'hop',
  'relation',
  '__count',
  '__payload_0',
  'dropped',
  'entity.name',
  'entity.type',
  'entity.sub_type',
  'entity.EngineMetadata.Type',
  'entity.source',
  'asset.criticality',
  'entity.risk.calculated_level',
  'entity.risk.calculated_score_norm',
  'entity.relationships.resolution.resolved_to',
];
const result = (rows: unknown[][]): EsqlResult => ({
  columns: columns.map((name) => ({ name, type: 'keyword' })),
  values: rows,
});
/** A joined row: walk columns, then the reached node's entity document (nulls when absent). */
const row = (
  from: string,
  to: string,
  reached: string | null,
  hop: number,
  relation: string,
  entity?: { name: string; type: string; subType?: string; engine: string }
): unknown[] => [
  from,
  to,
  reached,
  hop,
  relation,
  1,
  null,
  null,
  entity?.name ?? null,
  entity?.type ?? null,
  entity?.subType ?? null,
  entity?.engine ?? null,
  entity ? ['endpoint'] : null,
  null,
  null,
  null,
  null,
];

describe('mapGraphExpandResult', () => {
  const statement = buildGraphExpandStatement({
    plan,
    indexPattern: INDEX,
    lookupIndex: LOOKUP,
    seedId: seed.id,
  });

  it('turns joined rows into resolved nodes typed by reached side, with edges in stored orientation', () => {
    const { output, hubs } = mapGraphExpandResult(
      result([
        row(seed.id, HASH, HASH, 1, EXECUTED, {
          name: HASH,
          type: 'Indicator',
          subType: 'File hash',
          engine: 'generic',
        }),
        row(seed.id, '185.220.101.42', '185.220.101.42', 1, CONNECTED, {
          name: '185.220.101.42',
          type: 'Indicator',
          subType: 'IP address',
          engine: 'generic',
        }),
        row('host:WIN-FIN-03', HASH, 'host:WIN-FIN-03', 2, EXECUTED, {
          name: 'WIN-FIN-03',
          type: 'Host',
          engine: 'host',
        }),
        row('host:WIN-FIN-03', '185.220.101.42', null, 2, CONNECTED),
      ]),
      statement,
      plan,
      seed
    );
    expect(hubs).toEqual([]);
    expect(output.nodes).toEqual([
      seed,
      {
        id: HASH,
        hop: 1,
        via: 'executed',
        type: 'indicator',
        euid: HASH,
        resolved: true,
        entity: {
          name: HASH,
          type: 'Indicator',
          sub_type: 'File hash',
          engine_type: 'generic',
          sources: ['endpoint'],
        },
      },
      {
        id: '185.220.101.42',
        hop: 1,
        via: 'connected_to',
        type: 'indicator',
        euid: '185.220.101.42',
        resolved: true,
        entity: {
          name: '185.220.101.42',
          type: 'Indicator',
          sub_type: 'IP address',
          engine_type: 'generic',
          sources: ['endpoint'],
        },
      },
      {
        id: 'host:WIN-FIN-03',
        hop: 2,
        via: 'executed',
        type: 'host',
        euid: 'host:WIN-FIN-03',
        resolved: true,
        entity: { name: 'WIN-FIN-03', type: 'Host', engine_type: 'host', sources: ['endpoint'] },
      },
    ]);
    expect(output.edges.map((e) => [e.hop, e.source, e.relation, e.target])).toEqual([
      [1, seed.id, 'executed', HASH],
      [1, seed.id, 'connected_to', '185.220.101.42'],
      [2, 'host:WIN-FIN-03', 'executed', HASH],
      [2, 'host:WIN-FIN-03', 'connected_to', '185.220.101.42'],
    ]);
    expect(output).toMatchObject({
      hops_planned: 6,
      hops_executed: 2,
      stop_reason: 'frontier_exhausted',
      truncated: false,
      node_count: 4,
      edge_count: 4,
    });
  });

  it('marks a joined row without entity fields as an id the store lacks', () => {
    const { output } = mapGraphExpandResult(
      result([row(seed.id, 'ghost', 'ghost', 1, EXECUTED)]),
      statement,
      plan,
      seed
    );
    expect(output.nodes[1]).toEqual({
      id: 'ghost',
      hop: 1,
      via: 'executed',
      type: 'indicator',
      euid: 'ghost',
      resolved: false,
    });
  });

  it('leaves nodes unannotated when the statement did not join', () => {
    const plain = buildGraphExpandStatement({ plan, indexPattern: INDEX, seedId: seed.id });
    const unjoined: EsqlResult = {
      columns: [
        'node_from',
        'node_to',
        'node_reached',
        'hop',
        'relation',
        '__count',
        '__payload_0',
      ].map((name) => ({ name, type: 'keyword' })),
      values: [[seed.id, HASH, HASH, 1, EXECUTED, 1, null]],
    };
    const { output } = mapGraphExpandResult(unjoined, plain, plan, seed);
    expect(output.nodes[1]).toEqual({ id: HASH, hop: 1, via: 'executed', type: 'indicator' });
  });

  it('records hub stubs as truncation and reports max_hops when the budget was spent', () => {
    const rows = [
      row(seed.id, HASH, HASH, 1, EXECUTED, { name: HASH, type: 'Indicator', engine: 'generic' }),
    ];
    const stub = row(HASH, '', null, 6, EXECUTED);
    stub[1] = null;
    stub[7] = 250;
    const { output, hubs } = mapGraphExpandResult(result([...rows, stub]), statement, plan, seed);
    expect(hubs).toEqual([{ id: HASH, degree: 250 }]);
    expect(output.truncated).toBe(true);
    expect(output.stop_reason).toBe('max_hops');
    expect(output.edges).toHaveLength(1);
  });

  it('reports a result that fills the row limit as cut by max_edges_total', () => {
    const narrow = loadEntityGraphTraversalPlan('endpoint-shared-indicator-spread', {
      max_edges_total: 2,
    });
    if (!narrow) throw new Error('scenario missing');
    const cut = buildGraphExpandStatement({
      plan: narrow,
      indexPattern: INDEX,
      lookupIndex: LOOKUP,
      seedId: seed.id,
    });
    expect(cut.rowLimit).toBe(2);
    const rows = [
      row(seed.id, HASH, HASH, 1, EXECUTED, { name: HASH, type: 'Indicator', engine: 'generic' }),
      row(seed.id, '185.220.101.42', '185.220.101.42', 1, CONNECTED),
    ];
    const full = mapGraphExpandResult(result(rows), cut, narrow, seed);
    expect(full.output).toMatchObject({
      truncated: true,
      stop_reason: 'max_edges_total',
      edge_count: 2,
    });
    const partial = mapGraphExpandResult(result(rows.slice(0, 1)), cut, narrow, seed);
    expect(partial.output).toMatchObject({ truncated: false, stop_reason: 'frontier_exhausted' });
  });

  it('drops edges that touch an excluded node and never admits it', () => {
    const excluding = buildGraphExpandStatement({
      plan,
      indexPattern: INDEX,
      lookupIndex: LOOKUP,
      seedId: seed.id,
      exclusions: [{ field: 'entity.id', values: ['185.220.101.42'] }],
    });
    const { output } = mapGraphExpandResult(
      result([
        row(seed.id, HASH, HASH, 1, EXECUTED, { name: HASH, type: 'Indicator', engine: 'generic' }),
        row(seed.id, '185.220.101.42', '185.220.101.42', 1, CONNECTED),
      ]),
      excluding,
      plan,
      seed
    );
    expect(output.nodes.map((n) => n.id)).toEqual([seed.id, HASH]);
    expect(output.edges).toHaveLength(1);
  });

  it('keeps one edge per relation, source and target across hops', () => {
    const { output } = mapGraphExpandResult(
      result([
        row(seed.id, HASH, HASH, 1, EXECUTED, { name: HASH, type: 'Indicator', engine: 'generic' }),
        row('host:WIN-FIN-03', HASH, 'host:WIN-FIN-03', 2, EXECUTED, {
          name: 'WIN-FIN-03',
          type: 'Host',
          engine: 'host',
        }),
        row(seed.id, HASH, null, 2, EXECUTED),
        row('host:WIN-FIN-03', HASH, null, 3, EXECUTED),
      ]),
      statement,
      plan,
      seed
    );
    expect(output.edges.map((e) => [e.hop, e.source, e.target])).toEqual([
      [1, seed.id, HASH],
      [2, 'host:WIN-FIN-03', HASH],
    ]);
    expect(output.hops_executed).toBe(3);
  });

  it('reports until matches and routes when a stop id is reached', () => {
    const stopping = buildGraphExpandStatement({
      plan,
      indexPattern: INDEX,
      lookupIndex: LOOKUP,
      seedId: seed.id,
      until: [{ field: 'entity.id', values: ['host:WIN-FIN-03'] }],
    });
    const { output } = mapGraphExpandResult(
      result([
        row(seed.id, HASH, HASH, 1, EXECUTED, { name: HASH, type: 'Indicator', engine: 'generic' }),
        row('host:WIN-FIN-03', HASH, 'host:WIN-FIN-03', 2, EXECUTED, {
          name: 'WIN-FIN-03',
          type: 'Host',
          engine: 'host',
        }),
      ]),
      stopping,
      plan,
      seed
    );
    expect(output.stop_reason).toBe('until_matched');
    expect(output.until_matches).toEqual(['host:WIN-FIN-03']);
    expect(output.routes).toBeDefined();
  });

  it('refuses a result without the walk columns', () => {
    expect(() =>
      mapGraphExpandResult(
        { columns: [{ name: 'x', type: 'keyword' }], values: [] },
        statement,
        plan,
        seed
      )
    ).toThrow('node_from/node_to/entity.id/hop');
  });
});

describe('readEntity', () => {
  it('returns undefined for a row with no entity fields and reads what is present otherwise', () => {
    expect(readEntity(() => null)).toBeUndefined();
    const values: Record<string, unknown> = {
      'entity.name': 'okta-developer',
      'entity.type': 'Service Account',
      'entity.EngineMetadata.Type': 'generic',
      'asset.criticality': 'high_impact',
      'entity.risk.calculated_score_norm': 42.5,
      'entity.relationships.resolution.resolved_to': 'other',
    };
    expect(readEntity((name) => values[name])).toEqual({
      entity: {
        name: 'okta-developer',
        type: 'Service Account',
        engine_type: 'generic',
        criticality: 'high_impact',
        risk_score: 42.5,
      },
      resolvedTo: 'other',
    });
  });
});
