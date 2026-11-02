/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellDefinition, InputDefinition } from '../../common/types';
import { buildGraph, getDescendants } from './graph';

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

const markdown = (name: string): CellDefinition => ({
  id: name,
  name,
  type: 'markdown',
  content: '# hi',
});

const time = (name: string, pinned = true): CellDefinition =>
  input(name, { kind: 'time', pinned, defaultValue: { from: 'now-15m', to: 'now' } });

const dropdown = (name: string, optionsQuery = ''): CellDefinition =>
  input(name, { kind: 'dropdown', optionsQuery, defaultValue: null });

const range = (name: string): CellDefinition =>
  input(name, { kind: 'range', min: 0, max: 100, defaultValue: null });

const graphOf = (cells: CellDefinition[], cellOrder = cells.map(({ id }) => id)) =>
  buildGraph(Object.fromEntries(cells.map((cell) => [cell.id, cell])), cellOrder);

describe('buildGraph', () => {
  it('links consumers to the inputs exposing their params, and charts to their source', () => {
    const graph = graphOf([
      time('time'),
      dropdown('os', 'FROM logs | WHERE @timestamp >= ?_tstart | STATS BY os'),
      esql('q', 'FROM logs | WHERE @timestamp >= ?_tstart AND os == ?os'),
      chart('c', 'q'),
      markdown('notes'),
    ]);

    expect(graph.parents.get('os')).toEqual(['time']);
    expect([...(graph.parents.get('q') ?? [])].sort()).toEqual(['os', 'time']);
    expect(graph.parents.get('c')).toEqual(['q']);
    expect([...(graph.children.get('time') ?? [])].sort()).toEqual(['os', 'q']);
    expect(graph.children.get('q')).toEqual(['c']);
    expect(graph.parents.has('notes')).toBe(false);
    expect(graph.errors.size).toBe(0);
  });

  it('sorts cells topologically even when the notebook lists consumers first', () => {
    const graph = graphOf([
      chart('c', 'q'),
      esql('q', 'FROM logs | WHERE os == ?os'),
      dropdown('os'),
      markdown('notes'),
    ]);
    expect(graph.order).toEqual(['os', 'q', 'c']);
  });

  it('breaks ties between independent cells by notebook order', () => {
    const graph = graphOf(
      [esql('b', 'FROM b'), esql('a', 'FROM a'), chart('cb', 'b')],
      ['b', 'a', 'cb']
    );
    expect(graph.order).toEqual(['b', 'a', 'cb']);
  });

  it('gives a chart without a source no parent and no error', () => {
    const graph = graphOf([chart('c', null)]);
    expect(graph.parents.get('c')).toEqual([]);
    expect(graph.errors.size).toBe(0);
    expect(graph.order).toEqual(['c']);
  });

  it('flags a param no input exposes', () => {
    const graph = graphOf([esql('q', 'FROM logs | WHERE os == ?os')]);
    expect(graph.errors.get('q')).toMatch(/\?os/);
  });

  it('flags a chart whose source is missing or not an ES|QL cell', () => {
    const graph = graphOf([dropdown('os'), chart('gone', 'nope'), chart('wrong', 'os')]);
    expect(graph.errors.get('gone')).toBeDefined();
    expect(graph.errors.get('wrong')).toBeDefined();
    expect(graph.errors.has('os')).toBe(false);
  });

  it('flags every cell in a cycle, but not cells outside it', () => {
    const graph = graphOf([
      dropdown('a', 'FROM x | WHERE y == ?b | STATS BY y'),
      dropdown('b', 'FROM x | WHERE y == ?a | STATS BY y'),
      esql('q', 'FROM x | WHERE y == ?a'),
      esql('free', 'FROM x'),
    ]);
    expect(graph.errors.get('a')).toMatch(/cycle|circular/i);
    expect(graph.errors.get('b')).toMatch(/cycle|circular/i);
    expect(graph.errors.has('q')).toBe(false);
    expect(graph.errors.has('free')).toBe(false);
    expect([...graph.order].sort()).toEqual(['a', 'b', 'free', 'q']);
    expect(graph.order.indexOf('q')).toBeGreaterThan(graph.order.indexOf('a'));
  });

  it('flags every member of a cycle that is entered through an already visited cell', () => {
    const graph = graphOf([
      dropdown('a', 'FROM x | WHERE y == ?b OR y == ?c | STATS BY y'),
      dropdown('b', 'FROM x | WHERE y == ?a | STATS BY y'),
      dropdown('c', 'FROM x | WHERE y == ?d | STATS BY y'),
      dropdown('d', 'FROM x | WHERE y == ?b | STATS BY y'),
    ]);
    expect([...graph.errors.keys()].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('flags a dropdown whose options query references itself', () => {
    const graph = graphOf([dropdown('os', 'FROM x | WHERE os == ?os | STATS BY os')]);
    expect(graph.errors.get('os')).toMatch(/cycle|circular/i);
  });

  it('flags both inputs when their exposed params collide', () => {
    const graph = graphOf([range('bytes'), dropdown('bytes_min')]);
    expect(graph.errors.get('bytes')).toMatch(/bytes_min/);
    expect(graph.errors.get('bytes_min')).toMatch(/bytes_min/);
  });

  it('flags a second pinned time input', () => {
    const graph = graphOf([time('time'), time('time2')]);
    expect(graph.errors.has('time')).toBe(true);
    expect(graph.errors.has('time2')).toBe(true);
  });

  it('allows several unpinned time inputs', () => {
    const graph = graphOf([time('window', false), time('baseline', false), time('time')]);
    expect(graph.errors.size).toBe(0);
  });

  it.each(['Os', '_os', '2x', 'my-cell'])('flags the invalid name %p', (name) => {
    const graph = graphOf([{ ...esql('q', 'FROM x'), name }]);
    expect(graph.errors.get('q')).toBeDefined();
  });

  it('flags every cell sharing a name, markdown included', () => {
    const graph = graphOf([
      { ...esql('q1', 'FROM x'), name: 'dup' },
      { ...markdown('m'), name: 'dup' },
      esql('ok', 'FROM x'),
    ]);
    expect(graph.errors.get('q1')).toMatch(/dup/);
    expect(graph.errors.get('m')).toMatch(/dup/);
    expect(graph.errors.has('ok')).toBe(false);
  });
});

describe('getDescendants', () => {
  it('returns every transitive child, excluding unrelated cells and the roots themselves', () => {
    const graph = graphOf([
      time('time'),
      dropdown('os', 'FROM logs | WHERE @timestamp >= ?_tstart | STATS BY os'),
      esql('q', 'FROM logs | WHERE os == ?os'),
      chart('c', 'q'),
      esql('other', 'FROM logs'),
      chart('c2', 'other'),
    ]);
    expect([...getDescendants(graph, ['time'])].sort()).toEqual(['c', 'os', 'q']);
    expect([...getDescendants(graph, ['other'])]).toEqual(['c2']);
  });
});
