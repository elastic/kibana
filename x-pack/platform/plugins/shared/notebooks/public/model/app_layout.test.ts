/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellDefinition, NotebookApp } from '../../common/types';
import {
  type AppCellDefinition,
  appDependsOn,
  appendPanel,
  applyGridLayout,
  toGridLayout,
  createEmptyApp,
  generateDefaultApp,
  getAppStatusGroups,
  getNewAppTitle,
  reconcileApps,
  setGridColumns,
} from './app_layout';
import type { CellStatus } from './types';
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
const dropdown = (id: string): AppCellDefinition => ({
  id,
  name: id,
  type: 'input',
  input: { kind: 'dropdown', optionsQuery: '', defaultValue: null },
});

const code = (id: string): CellDefinition => ({
  id,
  name: id,
  type: 'code',
  runMode: 'auto',
  code: 'export const total = 1;',
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
    expect(panelFor('intro')).toMatchObject({ x: 0, y: 0, width: 12, height: 5 });
    expect(panelFor('host')).toMatchObject({ x: 0, y: 5 });
    expect(panelFor('trend')).toMatchObject({ x: 0, y: 8, width: 6 });
    expect(panelFor('split')).toMatchObject({ x: 6, y: 8, width: 6 });
    expect(panelFor('raw')).toMatchObject({ x: 0, y: 20, width: 12 });
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
    expect(next.panels[1]).toEqual({ id: 'new', cellId: 'host', x: 0, y: 9, width: 4, height: 3 });
  });

  it('sizes the panel for the app grid columns', () => {
    const app: NotebookApp = { id: 'app', title: 'App 1', panels: [], gridColumns: 24 };
    expect(appendPanel(app, dropdown('host'), () => 'new').panels[0]).toMatchObject({ width: 8 });
  });
});

describe('setGridColumns', () => {
  const app: NotebookApp = {
    id: 'app',
    title: 'App 1',
    panels: [
      { id: 'left', cellId: 'a', x: 0, y: 0, width: 6, height: 4 },
      { id: 'right', cellId: 'b', x: 6, y: 0, width: 6, height: 4 },
    ],
  };

  it('keeps each panel share of the width', () => {
    const wider = setGridColumns(app, 24);
    expect(wider.gridColumns).toBe(24);
    expect(wider.panels.map(({ x, width }) => [x, width])).toEqual([
      [0, 12],
      [12, 12],
    ]);
  });

  it('keeps panels inside the grid and at least one column wide', () => {
    const narrow = setGridColumns(app, 1);
    expect(narrow.panels.map(({ x, width }) => [x, width])).toEqual([
      [0, 1],
      [0, 1],
    ]);
  });

  it('drops the setting when going back to the default', () => {
    expect(setGridColumns(setGridColumns(app, 24), 12)).toEqual(app);
  });
});

describe('appDependsOn', () => {
  const time = createPinnedTimeCell({});
  const timed: CellDefinition = {
    id: 'timed',
    name: 'timed',
    type: 'esql',
    runMode: 'auto',
    query: 'FROM logs | WHERE @timestamp >= ?_tstart',
  };
  const cells = toRecord([time, timed, chart('trend', 'timed'), esql('raw')]);
  const order = [time.id, 'timed', 'trend', 'raw'];
  const appOf = (...cellIds: string[]): NotebookApp => ({
    id: 'app',
    title: 'App 1',
    panels: cellIds.map((cellId) => ({ id: cellId, cellId, x: 0, y: 0, width: 1, height: 1 })),
  });

  it('follows dependencies through intermediate cells', () => {
    expect(appDependsOn(appOf('trend'), cells, order, time.id)).toBe(true);
  });

  it('is false when no shown cell uses the cell', () => {
    expect(appDependsOn(appOf('raw'), cells, order, time.id)).toBe(false);
    expect(appDependsOn(appOf(), cells, order, time.id)).toBe(false);
  });
});

describe('reconcileApps', () => {
  const sales: NotebookApp = {
    id: 'sales',
    title: 'Sales',
    panels: [{ id: 'p1', cellId: 'trend', x: 0, y: 0, width: 6, height: 7 }],
  };
  const ops: NotebookApp = { id: 'ops', title: 'Ops', panels: [] };

  it('reorders, renames and drops apps to match the tabs', () => {
    const next = reconcileApps([sales, ops], [{ id: 'ops', label: 'Operations' }]);
    expect(next).toEqual([{ ...ops, title: 'Operations' }]);
  });

  it('starts new tabs empty and copies the panels of duplicated ones', () => {
    const next = reconcileApps(
      [sales],
      [
        { id: 'sales', label: 'Sales' },
        { id: 'copy', label: 'Sales (copy)', duplicatedFromId: 'sales' },
        { id: 'fresh', label: 'App 3' },
      ],
      () => 'p2'
    );
    expect(next[0]).toBe(sales);
    expect(next[1]).toEqual({
      id: 'copy',
      title: 'Sales (copy)',
      panels: [{ ...sales.panels[0], id: 'p2' }],
    });
    expect(next[2]).toEqual({ id: 'fresh', title: 'App 3', panels: [] });
  });

  it('carries the settings over to duplicates', () => {
    const [, copy] = reconcileApps(
      [{ ...sales, hideTimePicker: true, heading: 'Sales', description: 'By region' }],
      [
        { id: 'sales', label: 'Sales' },
        { id: 'copy', label: 'Sales (copy)', duplicatedFromId: 'sales' },
      ],
      () => 'p2'
    );
    expect(copy).toMatchObject({
      id: 'copy',
      title: 'Sales (copy)',
      hideTimePicker: true,
      heading: 'Sales',
      description: 'By region',
    });
  });
});

describe('getAppStatusGroups', () => {
  const cells = toRecord([esql('a'), esql('b'), esql('c'), esql('d'), notes('intro')]);
  const statuses: Record<string, CellStatus> = {
    a: 'stale',
    b: 'error',
    c: 'done',
    d: 'stale',
    intro: 'idle',
  };
  const appOf = (...cellIds: string[]): NotebookApp => ({
    id: 'app',
    title: 'App',
    panels: cellIds.map((cellId, index) => ({
      id: `p${index}`,
      cellId,
      x: 0,
      y: index,
      width: 1,
      height: 1,
    })),
  });

  it('groups cells needing attention, most severe first, without markdown', () => {
    expect(
      getAppStatusGroups(appOf('a', 'b', 'c', 'd', 'intro'), cells, (id) => statuses[id])
    ).toEqual([
      { status: 'error', names: ['b'] },
      { status: 'stale', names: ['a', 'd'] },
    ]);
  });

  it('is empty when every cell is done or running', () => {
    expect(getAppStatusGroups(appOf('c'), cells, () => 'running')).toEqual([]);
  });

  it('counts a cell once even if it has several panels', () => {
    expect(getAppStatusGroups(appOf('a', 'a'), cells, (id) => statuses[id])).toEqual([
      { status: 'stale', names: ['a'] },
    ]);
  });
});

describe('grid layout conversion', () => {
  const panels = [
    { id: 'p1', cellId: 'a', x: 0, y: 0, width: 6, height: 4 },
    { id: 'p2', cellId: 'b', x: 6, y: 0, width: 6, height: 4 },
  ];

  it('round-trips panels through the grid layout', () => {
    expect(applyGridLayout(panels, toGridLayout(panels))).toEqual(panels);
  });

  it('moves and resizes panels from the layout and keeps the cell they show', () => {
    const layout = toGridLayout(panels);
    const moved = {
      ...layout,
      p2: { type: 'panel' as const, id: 'p2', column: 0, row: 4, width: 12, height: 2 },
    };
    expect(applyGridLayout(panels, moved)[1]).toEqual({
      id: 'p2',
      cellId: 'b',
      x: 0,
      y: 4,
      width: 12,
      height: 2,
    });
  });

  it('stores fine positions as fractions of a grid cell', () => {
    const fine = toGridLayout(panels, 4);
    expect(fine.p2).toMatchObject({ column: 24, row: 0, width: 24, height: 16 });
    const nudged = { ...fine, p2: { ...fine.p2, column: 25, row: 3 } };
    expect(applyGridLayout(panels, nudged, 4)[1]).toMatchObject({ x: 6.25, y: 0.75 });
  });

  it('rounds fine positions to whole cells when snapping again', () => {
    const fine = [{ ...panels[0], x: 0.75, width: 5.25 }];
    expect(toGridLayout(fine).p1).toMatchObject({ column: 1, width: 5 });
  });

  it('keeps a panel the layout does not mention where it was', () => {
    const { p1 } = toGridLayout(panels);
    expect(applyGridLayout(panels, { p1 })).toEqual(panels);
  });
});

describe('code cells', () => {
  it('are left out of the default app', () => {
    const app = generateDefaultApp(
      toRecord([dropdown('host'), code('calc')]),
      ['host', 'calc'],
      'App',
      sequentialIds()
    );
    expect(app.panels.map(({ cellId }) => cellId)).toEqual(['host']);
  });
});

describe('getNewAppTitle', () => {
  it('numbers past titles already in use', () => {
    expect(getNewAppTitle([])).toBe('App 1');
    expect(getNewAppTitle([{ id: 'a', title: 'App 2', panels: [] }])).toBe('App 3');
  });
});

describe('NotebookStore apps', () => {
  const cells = [esql('raw'), dropdown('host'), code('calc')];
  const createStore = () =>
    new NotebookStore({ title: 'T', cellOrder: ['raw', 'host', 'calc'], cells: toRecord(cells) });

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
    store.addCellToApp('app', 'calc');
    expect(store.apps$.getValue()[0].panels.map(({ cellId }) => cellId)).toEqual(['raw', 'host']);

    store.removeCell('raw');
    expect(store.toAttributes().panels?.[0].panels.map(({ cellId }) => cellId)).toEqual(['host']);
  });
});
