/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadEntityGraphTraversalPlan } from '@kbn/workflows/managed';
import { buildGraphExpandStatement } from './build_graph_expand';
import { mapGraphExpandResult, type EsqlResult } from './map_graph_expand_result';

const HASH = 'a3f5c9d1e8b74620fa1c0d5e2b9847361c0ded4488ab2f0e9a7c6b5d4e3f2a10';
const plan = loadEntityGraphTraversalPlan('endpoint-shared-indicator-spread');
if (!plan) throw new Error('scenario missing');
const seed = 'host:WKSTN-RECV01';

const columns = [
  'node_from',
  'node_to',
  'node_reached',
  'hop',
  'relation',
  '__count',
  '__payload_0',
  '__payload_1',
  'dropped',
];
const result = (rows: unknown[][]): EsqlResult => ({
  columns: columns.map((name) => ({ name, type: 'keyword' })),
  values: rows,
});

describe('mapGraphExpandResult', () => {
  const statement = buildGraphExpandStatement({ plan, seedId: seed });

  it('turns rows into nodes typed by relation side, edges with payload, and closing edges', () => {
    const { output, hubs } = mapGraphExpandResult(
      result([
        [seed, HASH, HASH, 1, '__rel_0', 2, ['powershell.exe', 'rundll32.exe'], null, null],
        [seed, '185.220.101.42', '185.220.101.42', 1, '__rel_2', 1, 'powershell.exe', null, null],
        [
          'host:WIN-FIN-03',
          HASH,
          'host:WIN-FIN-03',
          2,
          '__rel_0',
          1,
          'UpdateService.exe',
          null,
          null,
        ],
        [
          'host:WIN-FIN-03',
          '185.220.101.42',
          null,
          2,
          '__rel_2',
          1,
          'UpdateService.exe',
          null,
          null,
        ],
      ]),
      statement,
      plan,
      seed
    );
    expect(hubs).toEqual([]);
    expect(output.nodes).toEqual([
      { id: seed, hop: 0, via: 'seed', type: 'host' },
      { id: HASH, hop: 1, via: 'executed', type: 'indicator' },
      { id: '185.220.101.42', hop: 1, via: 'connected_to', type: 'indicator' },
      { id: 'host:WIN-FIN-03', hop: 2, via: 'executed', type: 'host' },
    ]);
    expect(output.edges).toHaveLength(4);
    expect(output.edges[0]).toEqual({
      hop: 1,
      relation: 'executed',
      source: seed,
      target: HASH,
      count: 2,
      payload: { 'process.name': ['powershell.exe', 'rundll32.exe'] },
    });
    expect(output.edges[3]).toMatchObject({
      hop: 2,
      relation: 'connected_to',
      source: 'host:WIN-FIN-03',
    });
    expect(output).toMatchObject({
      hops_planned: 6,
      hops_executed: 2,
      stop_reason: 'frontier_exhausted',
      truncated: false,
      node_count: 4,
      edge_count: 4,
    });
  });

  it('records hub stubs as truncation and reports max_hops when the budget was spent', () => {
    const { output, hubs } = mapGraphExpandResult(
      result([
        [seed, HASH, HASH, 1, '__rel_0', 1, null, null, null],
        [HASH, null, null, 6, null, null, null, null, 250],
      ]),
      statement,
      plan,
      seed
    );
    expect(hubs).toEqual([{ id: HASH, degree: 250 }]);
    expect(output.truncated).toBe(true);
    expect(output.stop_reason).toBe('max_hops');
    expect(output.edges).toHaveLength(1);
  });

  it('drops edges that touch an excluded node and never admits it', () => {
    const excluding = buildGraphExpandStatement({
      plan,
      seedId: seed,
      exclusions: [{ field: 'entity.id', values: ['185.220.101.42'] }],
    });
    const { output } = mapGraphExpandResult(
      result([
        [seed, HASH, HASH, 1, '__rel_0', 1, null, null, null],
        [seed, '185.220.101.42', '185.220.101.42', 1, '__rel_2', 1, null, null, null],
      ]),
      excluding,
      plan,
      seed
    );
    expect(output.nodes.map((n) => n.id)).toEqual([seed, HASH]);
    expect(output.edges).toHaveLength(1);
  });

  it('keeps one edge per relation, source and target across hops', () => {
    const { output } = mapGraphExpandResult(
      result([
        [seed, HASH, HASH, 1, '__rel_0', 2, null, null, null],
        ['host:WIN-FIN-03', HASH, 'host:WIN-FIN-03', 2, '__rel_0', 1, null, null, null],
        [seed, HASH, null, 2, '__rel_0', 2, null, null, null],
        ['host:WIN-FIN-03', HASH, null, 3, '__rel_0', 1, null, null, null],
      ]),
      statement,
      plan,
      seed
    );
    expect(output.edges.map((e) => [e.hop, e.source, e.target])).toEqual([
      [1, seed, HASH],
      [2, 'host:WIN-FIN-03', HASH],
    ]);
    expect(output.hops_executed).toBe(3);
  });

  it('reports stop-condition matches with their routes and the until_matched stop reason', () => {
    const stopping = buildGraphExpandStatement({
      plan,
      seedId: seed,
      until: [{ field: 'entity.id', values: ['host:WIN-FIN-03', 'host:NEVER'] }],
    });
    const { output } = mapGraphExpandResult(
      result([
        [seed, HASH, HASH, 1, '__rel_0', 1, null, null, null],
        ['host:WIN-FIN-03', HASH, 'host:WIN-FIN-03', 2, '__rel_0', 1, null, null, null],
      ]),
      stopping,
      plan,
      seed
    );
    expect(output.stop_reason).toBe('until_matched');
    expect(output.until_matches).toEqual(['host:WIN-FIN-03']);
    expect(output.routes).toEqual([
      { id: 'host:WIN-FIN-03', route: [seed, HASH, 'host:WIN-FIN-03'] },
    ]);
  });

  it('refuses a result without the walk columns', () => {
    expect(() =>
      mapGraphExpandResult(
        { columns: [{ name: 'x', type: 'keyword' }], values: [] },
        statement,
        plan,
        seed
      )
    ).toThrow('node_from/node_to/node_reached/hop');
  });
});
