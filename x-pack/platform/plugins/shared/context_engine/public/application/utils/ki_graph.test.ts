/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryAiIndicesResponse } from '../../../common/http_api/ai_indices';
import {
  KI_GRAPH_MAX_KIS,
  buildKiGraph,
  buildKiGraphQuery,
  kiGroupOf,
  referenceNodeId,
} from './ki_graph';

const columns: QueryAiIndicesResponse['columns'] = [
  { name: '_index', type: 'keyword' },
  { name: 'id', type: 'keyword' },
  { name: 'type', type: 'keyword' },
  { name: 'title', type: 'text' },
  { name: 'references.uri', type: 'keyword' },
];

const row = (
  id: string,
  type: string,
  title: string | null,
  references: string[] | string | null
) => ['ai-index-idx-test', id, type, title, references];

describe('buildKiGraphQuery', () => {
  it('reads every KI with its backing index and references', () => {
    expect(buildKiGraphQuery('ai-index-idx-test')).toBe(
      `FROM ai-index-idx-test METADATA _index | KEEP _index, id, type, title, references.uri | LIMIT ${KI_GRAPH_MAX_KIS}`
    );
  });

  it('refuses a destination that would change the query', () => {
    expect(() => buildKiGraphQuery('idx | DROP id')).toThrow(/cannot be queried/);
  });
});

describe('kiGroupOf', () => {
  it.each([
    ['memory.entity.service', 'memory.entity'],
    ['memory.relationship.sells_in', 'memory.relationship'],
    ['memory.session_fact', 'memory.session'],
    ['memory.session', 'memory.session'],
    ['memory.short_term.session_fact', 'memory.short_term'],
    ['constraint', 'constraint'],
    [undefined, 'other'],
  ])('puts %s in the %s layer', (type, group) => {
    expect(kiGroupOf(type)).toBe(group);
  });
});

describe('buildKiGraph', () => {
  const graph = buildKiGraph({
    columns,
    values: [
      row(
        'memory/entity/manufacturer/acme',
        'memory.entity.manufacturer',
        'Acme',
        'index://orders'
      ),
      row('memory/entity/category/shoes', 'memory.entity.category', 'Shoes', null),
      row(
        'memory/relationship/sells_in/acme/shoes',
        'memory.relationship.sells_in',
        'acme sells_in shoes',
        [
          'ki://memory/entity/manufacturer/acme',
          'ki://memory/entity/category/shoes',
          'ki://not-in-graph',
        ]
      ),
      row('untitled', 'constraint', null, ['index://orders', 'index://orders']),
      // The first revision wins; a duplicate row is ignored.
      row('untitled', 'constraint', 'Duplicate', null),
    ],
  });
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));

  it('links KIs that reference each other', () => {
    expect(graph.neighbors.get('memory/relationship/sells_in/acme/shoes')).toEqual(
      new Set([
        'memory/entity/manufacturer/acme',
        'memory/entity/category/shoes',
        referenceNodeId('ki://not-in-graph'),
      ])
    );
  });

  it('turns references outside the graph into reference nodes shared by every KI citing them', () => {
    expect(byId.get(referenceNodeId('index://orders'))).toMatchObject({
      kind: 'reference',
      group: 'ref:index',
      label: 'orders',
      uri: 'index://orders',
      degree: 2,
    });
    expect(byId.get(referenceNodeId('ki://not-in-graph'))).toMatchObject({ group: 'ref:ki' });
  });

  it('labels KIs by title, falling back to the id, and keeps the backing index', () => {
    expect(byId.get('memory/entity/manufacturer/acme')).toMatchObject({
      kind: 'ki',
      label: 'Acme',
      group: 'memory.entity',
      index: 'ai-index-idx-test',
      degree: 2,
    });
    expect(byId.get('untitled')?.label).toBe('untitled');
  });

  it('never repeats a link', () => {
    const keys = graph.links.map(({ source, target }) => [source, target].sort().join('|'));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('orders layers with KIs first, largest first', () => {
    expect(graph.layers.map(({ group, count }) => [group, count])).toEqual([
      ['memory.entity', 2],
      ['constraint', 1],
      ['memory.relationship', 1],
      ['ref:index', 1],
      ['ref:ki', 1],
    ]);
    expect(graph.truncated).toBe(false);
  });
});
