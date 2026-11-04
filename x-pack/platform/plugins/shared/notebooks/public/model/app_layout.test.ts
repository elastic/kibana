/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellDefinition, NotebookApp } from '../../common/types';
import { appendPanel, createEmptyApp, generateDefaultApp, getNewAppTitle } from './app_layout';
import { createPinnedTimeCell } from './cell_factory';
import { NotebookStore } from './notebook_store';

const esql = (id: string): CellDefinition => ({
  id,
  name: id,
  type: 'esql',
  runMode: 'auto',
  query: 'FROM logs',
});
const chart = (id: string, sourceCell: string): CellDefinition => ({
  id,
  name: id,
  type: 'chart',
  runMode: 'auto',
  sourceCell,
  lensAttributes: null,
});
const notes = (id: string): CellDefinition => ({ id, name: id, type: 'markdown', content: '# Hi' });
const dropdown = (id: string): CellDefinition => ({
  id,
  name: id,
  type: 'input',
  input: { kind: 'dropdown', optionsQuery: '', defaultValue: null },
});

const sequentialIds = () => {
  let next = 0;
  return () => `id-${next++}`;
};

const toRecord = (cells: CellDefinition[]) =>
  Object.fromEntries(cells.map((cell) => [cell.id, cell]));

describe('generateDefaultApp', () => {
  const time = createPinnedTimeCell({});
  const cells = [
    time,
    esql('raw'),
    esql('totals'),
    chart('trend', 'totals'),
    chart('split', 'totals'),
    dropdown('host'),
    notes('intro'),
  ];

  const app = generateDefaultApp(
    toRecord(cells),
    cells.map(({ id }) => id),
    'App 1',
    sequentialIds()
  );
  const panelFor = (cellId: string) => app.panels.find((panel) => panel.cellId === cellId);

  it('orders notes, controls, charts, then tables, each section on its own rows', () => {
    expect(app.panels.map(({ cellId }) => cellId)).toEqual([
      'intro',
      'host',
      'trend',
      'split',
      'raw',
    ]);
    expect(panelFor('intro')).toMatchObject({ x: 0, y: 0, width: 12, height: 3 });
    expect(panelFor('host')).toMatchObject({ x: 0, y: 3 });
    expect(panelFor('trend')).toMatchObject({ x: 0, y: 5, width: 6 });
    expect(panelFor('split')).toMatchObject({ x: 6, y: 5, width: 6 });
    expect(panelFor('raw')).toMatchObject({ x: 0, y: 12, width: 12 });
  });

  it('leaves out the pinned time cell and queries a chart already shows', () => {
    expect(panelFor(time.id)).toBeUndefined();
    expect(panelFor('totals')).toBeUndefined();
  });
});

describe('appendPanel', () => {
  it('starts a new row below the lowest panel', () => {
    const app: NotebookApp = {
      id: 'app',
      title: 'App 1',
      panels: [{ id: 'p', cellId: 'trend', x: 0, y: 2, width: 6, height: 7 }],
    };
    const next = appendPanel(app, dropdown('host'), () => 'new');
    expect(next.panels[1]).toEqual({ id: 'new', cellId: 'host', x: 0, y: 9, width: 4, height: 2 });
  });
});

describe('getNewAppTitle', () => {
  it('numbers past titles already in use', () => {
    expect(getNewAppTitle([])).toBe('App 1');
    expect(getNewAppTitle([{ id: 'a', title: 'App 2', panels: [] }])).toBe('App 3');
  });
});

describe('NotebookStore apps', () => {
  const cells = [esql('raw'), dropdown('host')];
  const createStore = () =>
    new NotebookStore({ title: 'T', cellOrder: ['raw', 'host'], cells: toRecord(cells) });

  it('has no apps and saves no panels until one is created', () => {
    const store = createStore();
    expect(store.apps$.getValue()).toEqual([]);
    expect(store.toAttributes()).not.toHaveProperty('panels');
  });

  it('adds a cell once and drops its panels when the cell is removed', () => {
    const store = createStore();
    const app = createEmptyApp([], () => 'app');
    store.addApp(app);
    store.addCellToApp('app', 'raw');
    store.addCellToApp('app', 'raw');
    store.addCellToApp('app', 'host');
    expect(store.apps$.getValue()[0].panels.map(({ cellId }) => cellId)).toEqual(['raw', 'host']);

    store.removeCell('raw');
    expect(store.toAttributes().panels?.[0].panels.map(({ cellId }) => cellId)).toEqual(['host']);
  });
});
