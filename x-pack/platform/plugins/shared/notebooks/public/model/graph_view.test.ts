/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellDefinition, InputDefinition } from '../../common/types';
import { buildGraphView, getDataSources, getDownstream, type GraphViewNode } from './graph_view';

const esql = (name: string, query: string): CellDefinition => ({
  id: name,
  name,
  type: 'esql',
  runMode: 'auto',
  query,
});

const chart = (name: string, sourceCell: string | null): CellDefinition => ({
  id: name,
  name,
  type: 'chart',
  runMode: 'auto',
  sourceCell,
  lensAttributes: null,
});

const input = (name: string, definition: InputDefinition): CellDefinition => ({
  id: name,
  name,
  type: 'input',
  input: definition,
});

const viewOf = (cells: CellDefinition[]) =>
  buildGraphView(
    Object.fromEntries(cells.map((cell) => [cell.id, cell])),
    cells.map(({ id }) => id)
  );

const nodeById = (nodes: readonly GraphViewNode[], id: string): GraphViewNode => {
  const node = nodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`No node ${id}`);
  return node;
};

describe('getDataSources', () => {
  it('lists the distinct index patterns of the FROM clause', () => {
    expect(getDataSources('FROM logs-*, metrics, logs-* | LIMIT 10')).toEqual([
      'logs-*',
      'metrics',
    ]);
  });

  it('returns nothing for a query without a source', () => {
    expect(getDataSources('ROW a = 1')).toEqual([]);
    expect(getDataSources('')).toEqual([]);
  });
});

describe('buildGraphView', () => {
  const cells = [
    input('os', {
      kind: 'dropdown',
      optionsQuery: 'FROM logs | STATS BY os',
      defaultValue: null,
    }),
    input('bytes', { kind: 'range', min: 0, max: 10, defaultValue: null }),
    esql('q', 'FROM logs | WHERE os == ?os AND bytes >= ?bytes_min AND bytes <= ?bytes_max'),
    chart('c', 'q'),
    { id: 'notes', name: 'notes', type: 'markdown', content: '# hi' } as const,
  ];

  it('has a node per cell, including isolated ones, and per data source', () => {
    const { nodes } = viewOf(cells);
    expect(nodes.map(({ id }) => id).sort()).toEqual([
      'bytes',
      'c',
      'notes',
      'os',
      'q',
      'source:logs',
    ]);
    expect(nodeById(nodes, 'source:logs')).toMatchObject({ kind: 'source', label: 'logs' });
    expect(nodeById(nodes, 'q')).toMatchObject({ kind: 'cell', cellId: 'q' });
  });

  it('labels input edges with the params they bind', () => {
    const { edges } = viewOf(cells);
    expect(edges.map(({ source, target, params }) => ({ source, target, params }))).toEqual(
      expect.arrayContaining([
        { source: 'source:logs', target: 'os', params: [] },
        { source: 'source:logs', target: 'q', params: [] },
        { source: 'os', target: 'q', params: ['os'] },
        { source: 'bytes', target: 'q', params: ['bytes_min', 'bytes_max'] },
        { source: 'q', target: 'c', params: [] },
      ])
    );
    expect(edges).toHaveLength(5);
  });

  it('collects the nodes and edges downstream of a node', () => {
    const { edges } = viewOf(cells);
    const downstream = getDownstream(edges, 'os');
    expect([...downstream.nodes].sort()).toEqual(['c', 'os', 'q']);
    expect([...downstream.edges].sort()).toEqual(['os->q', 'q->c']);
    expect([...getDownstream(edges, 'notes').edges]).toEqual([]);
  });

  it('lays nodes out top to bottom in dependency order', () => {
    const { nodes } = viewOf(cells);
    const y = (id: string) => nodeById(nodes, id).position.y;
    expect(y('source:logs')).toBeLessThan(y('os'));
    expect(y('os')).toBeLessThan(y('q'));
    expect(y('bytes')).toBeLessThan(y('q'));
    expect(y('q')).toBeLessThan(y('c'));
  });
});
