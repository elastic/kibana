/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomAppDefinition } from '../../common/app_definition';
import {
  getTabs,
  persistentDepth,
  rebaseLayout,
  scopedLayout,
  scopeOffset,
} from './custom_app_grid';

const definition = (panels: CustomAppDefinition['panels']): CustomAppDefinition =>
  ({ version: 1, title: 't', layout: {}, panels, surfaces: {} } as CustomAppDefinition);

describe('getTabs', () => {
  it('lists distinct tabs in declaration order', () => {
    expect(
      getTabs(
        definition({
          a: { tab: 'Overview' },
          b: { tab: 'Errors' },
          c: { tab: 'Overview' },
        })
      )
    ).toEqual(['Overview', 'Errors']);
  });

  it('ignores panels with no tab, which is what makes them persistent', () => {
    expect(getTabs(definition({ header: {}, a: { tab: 'Overview' } }))).toEqual(['Overview']);
  });

  it('returns nothing for an app that does not use tabs', () => {
    expect(getTabs(definition({ a: {}, b: {} }))).toEqual([]);
  });
});

describe('splitting an app across two grids', () => {
  const app = {
    layout: {
      header: { type: 'panel', id: 'header', row: 0, column: 0, width: 32, height: 3 },
      filters: { type: 'panel', id: 'filters', row: 3, column: 0, width: 48, height: 2 },
      chart: { type: 'panel', id: 'chart', row: 5, column: 0, width: 24, height: 10 },
      table: { type: 'panel', id: 'table', row: 15, column: 0, width: 24, height: 8 },
      logs: { type: 'panel', id: 'logs', row: 5, column: 0, width: 48, height: 12 },
    },
    panels: {
      header: {},
      filters: {},
      chart: { tab: 'Overview' },
      table: { tab: 'Overview' },
      logs: { tab: 'Logs' },
    },
  } as unknown as CustomAppDefinition;

  it('measures where the persistent panels end', () => {
    expect(persistentDepth(app)).toBe(5);
  });

  it('gives the persistent grid only the untabbed panels, unshifted', () => {
    const layout = scopedLayout(app, 'persistent', 'Overview', 0);
    expect(Object.keys(layout).sort()).toEqual(['filters', 'header']);
    expect(layout.filters.row).toBe(3);
  });

  it('rebases the active tab to row 0, so it does not open under a band of blank rows', () => {
    const layout = scopedLayout(app, 'tab', 'Overview', 5);
    expect(Object.keys(layout).sort()).toEqual(['chart', 'table']);
    expect(layout.chart.row).toBe(0);
    expect(layout.table.row).toBe(10);
  });

  it('never lets a hidden tab reserve space in the visible one', () => {
    expect(Object.keys(scopedLayout(app, 'tab', 'Logs', 5))).toEqual(['logs']);
  });

  it('round-trips a drag back to absolute rows', () => {
    const shown = scopedLayout(app, 'tab', 'Overview', 5);
    const dragged = { ...shown, chart: { ...shown.chart, row: 2 } };
    const stored = rebaseLayout(dragged, 5);
    // 2 rows below the tab's own origin is row 7 in the saved document.
    expect(stored.chart.row).toBe(7);
    expect(stored.table.row).toBe(15);
  });

  it('leaves the layout alone when there is nothing to rebase', () => {
    const layout = scopedLayout(app, 'persistent', undefined, 0);
    expect(rebaseLayout(layout, 0)).toBe(layout);
  });
});

describe('scopeOffset', () => {
  const app = (extra: Record<string, unknown> = {}) =>
    ({
      layout: {
        header: { type: 'panel', id: 'header', row: 0, column: 0, width: 48, height: 3 },
        chart: { type: 'panel', id: 'chart', row: 6, column: 0, width: 24, height: 10 },
        table: { type: 'panel', id: 'table', row: 16, column: 0, width: 24, height: 8 },
        ...(extra.layout as object),
      },
      panels: {
        header: {},
        chart: { tab: 'Overview' },
        table: { tab: 'Overview' },
        ...(extra.panels as object),
      },
    } as unknown as CustomAppDefinition);

  it('rebases a tab from its own topmost panel', () => {
    expect(scopeOffset(app(), 'tab', 'Overview')).toBe(6);
  });

  it('leaves the persistent strip at the origin', () => {
    expect(scopeOffset(app(), 'persistent', undefined)).toBe(0);
  });

  it('is unmoved by a panel added to the other grid', () => {
    // This is the freeze: deriving a tab's offset from where the persistent
    // panels ended meant adding an untabbed panel low in the document pushed
    // every tab panel above row 0, where they clamped together and the grid
    // fought its own echo forever.
    const grown = app({
      layout: { stray: { type: 'panel', id: 'stray', row: 61, column: 0, width: 24, height: 15 } },
      panels: { stray: { title: 'New panel' } },
    });
    expect(scopeOffset(grown, 'tab', 'Overview')).toBe(6);

    const shown = scopedLayout(grown, 'tab', 'Overview', scopeOffset(grown, 'tab', 'Overview'));
    // Still distinct rows rather than everything collapsed onto row 0.
    expect(shown.chart.row).toBe(0);
    expect(shown.table.row).toBe(10);
  });

  it('round-trips a rebased row back to where it was stored', () => {
    const current = app();
    const offset = scopeOffset(current, 'tab', 'Overview');
    const shown = scopedLayout(current, 'tab', 'Overview', offset);
    expect(rebaseLayout(shown, offset).table.row).toBe(current.layout.table.row);
  });

  it('falls back to the origin for a scope with no panels', () => {
    expect(scopeOffset(app(), 'tab', 'NoSuchTab')).toBe(0);
  });
});
