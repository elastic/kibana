/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraversalHop } from '../../../../common/graph_traversal/hop_types';
import { buildEdgeHopQuery } from './build_edge_hop_query';
import { HOP_QUERY_PREAMBLE } from './build_hop_query';

const EDGES = 'entities-edges-default';
const LOOKUP = '.entities.v2.latest.default-00001';
const hop: TraversalHop = {
  hop_number: 2,
  name: 'aws',
  match_field: 'entity.id',
  target_fields: [
    { field: 'entity.relationships.can_assume.ids', relation: 'can_assume' },
    { field: 'entity.relationships.bucket_policy.ids', relation: 'bucket_policy' },
  ],
  payload_fields: ['entity.name', 'entity.sub_type'],
};

describe('buildEdgeHopQuery', () => {
  it('reads every kind of the hop in one query, caps per node and kind, and joins the payload', () => {
    const { query, params } = buildEdgeHopQuery({
      hop,
      edgesIndex: EDGES,
      lookupIndex: LOOKUP,
      frontier: ['role:a', 'role:b'],
      visited: ['seed', 'role:a', 'role:b'],
      hubDegree: 200,
      limit: 500,
    });
    expect(params).toEqual([
      'role:a',
      'role:b',
      'can_assume',
      'bucket_policy',
      'seed',
      'role:a',
      'role:b',
    ]);
    expect(query).toBe(
      [
        HOP_QUERY_PREAMBLE,
        `FROM ${EDGES}`,
        '| WHERE src IN (?, ?) AND kind IN (?, ?)',
        '| WHERE NOT dst IN (?, ?, ?)',
        '| STATS __reached = TOP(dst, 201, "asc"), __read = COUNT(*) BY __source = src, __relation = kind',
        '| MV_EXPAND __reached',
        '| RENAME __reached AS `entity.id`',
        `| LOOKUP JOIN ${LOOKUP} ON \`entity.id\``,
        '| STATS __count = COUNT(*), __read = MAX(__read), __payload_0 = VALUES(`entity.name`), __payload_1 = VALUES(`entity.sub_type`) BY __source, __relation, __target = `entity.id`',
        '| LIMIT 500',
      ].join('\n')
    );
  });

  it('matches the frontier on dst and reaches src on an inbound leg, keeping the stored orientation', () => {
    const { query, params } = buildEdgeHopQuery({
      hop: { ...hop, payload_fields: [] },
      edgesIndex: EDGES,
      frontier: ['role:a'],
      hubDegree: 2,
      limit: 10,
      inbound: true,
    });
    expect(params).toEqual(['role:a', 'can_assume', 'bucket_policy']);
    expect(query).toBe(
      [
        HOP_QUERY_PREAMBLE,
        `FROM ${EDGES}`,
        '| WHERE dst IN (?) AND kind IN (?, ?)',
        '| STATS __reached = TOP(src, 3, "asc"), __read = COUNT(*) BY __target = dst, __relation = kind',
        '| MV_EXPAND __reached',
        '| STATS __count = COUNT(*), __read = MAX(__read) BY __target, __relation, __source = __reached',
        '| LIMIT 10',
      ].join('\n')
    );
  });

  it('applies node exclusions and the lookback to the edge documents, and the hop filter and other exclusions to the joined node', () => {
    const { query, params } = buildEdgeHopQuery({
      hop: { ...hop, filter: 'entity.source == "aws"' },
      edgesIndex: EDGES,
      lookupIndex: LOOKUP,
      frontier: ['role:a'],
      lookback: '7d',
      exclusions: [
        { field: 'entity.id', values: ['role:skip'] },
        { field: 'entity.sub_type', values: ['AWS IAM Policy'] },
      ],
      hubDegree: 2,
      limit: 10,
    });
    expect(params).toEqual([
      'role:a',
      'can_assume',
      'bucket_policy',
      'role:skip',
      'AWS IAM Policy',
    ]);
    expect(query).toContain('| WHERE NOT dst IN (?)\n| WHERE last_seen >= NOW() - 7 days');
    expect(query).toContain(
      [
        `| LOOKUP JOIN ${LOOKUP} ON \`entity.id\``,
        '| WHERE (entity.source == "aws")',
        '| WHERE `entity.sub_type` IS NULL OR NOT (MV_CONTAINS(`entity.sub_type`, ?))',
      ].join('\n')
    );
  });

  it('renames and keeps the edge columns before the join when there is no hub cap', () => {
    const { query } = buildEdgeHopQuery({
      hop,
      edgesIndex: EDGES,
      lookupIndex: LOOKUP,
      frontier: ['role:a'],
      limit: 10,
    });
    expect(query).toContain(
      [
        '| RENAME src AS __source, kind AS __relation, dst AS `entity.id`',
        '| KEEP __source, __relation, `entity.id`',
        `| LOOKUP JOIN ${LOOKUP} ON \`entity.id\``,
      ].join('\n')
    );
  });

  it('refuses entity-document filters without a lookup index to test them on', () => {
    expect(() =>
      buildEdgeHopQuery({
        hop: { ...hop, filter: 'entity.source == "aws"' },
        edgesIndex: EDGES,
        frontier: ['role:a'],
        limit: 10,
      })
    ).toThrow(/lookup index/);
  });

  it('refuses an empty frontier', () => {
    expect(() => buildEdgeHopQuery({ hop, edgesIndex: EDGES, frontier: [], limit: 10 })).toThrow(
      /empty frontier/
    );
  });
});
