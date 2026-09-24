/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomAppDefinition } from '../../common/app_definition';
import { getTabs, persistentDepth, rebaseLayout, scopedLayout } from './custom_app_grid';

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
