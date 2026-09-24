/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { A2uiMessage } from '@kbn/a2ui-renderer';
import type { CustomAppDefinition } from '../../common/app_definition';
import { addPanelTo, applyPanelEdit } from './panel_mutations';

const message = (text: string) =>
  ({
    version: 'v1.0',
    createSurface: { surfaceId: 'chart', components: [{ id: 'root', component: 'Text', text }] },
  } as A2uiMessage);

const definition = (): CustomAppDefinition =>
  ({
    version: 1,
    title: 'App',
    layout: {},
    panels: {
      chart: { title: 'Chart', tab: 'Overview', hideBorder: true },
      other: { title: 'Other', tab: 'Logs' },
    },
    surfaces: { chart: [message('before')], other: [message('other')] },
    queries: {
      chart: [{ path: '/a', shape: 'rows', query: 'FROM x | SORT a, b' }],
      other: [{ path: '/b', shape: 'rows', query: 'FROM y | SORT a, b' }],
    },
  } as unknown as CustomAppDefinition);

describe('applyPanelEdit', () => {
  it("writes the panel's components and queries back", () => {
    const next = applyPanelEdit(definition(), 'chart', {
      title: 'Chart',
      messages: [message('after')],
      queries: [{ path: '/a', shape: 'rows', query: 'FROM x | SORT c, d' }],
    });

    expect(JSON.stringify(next.surfaces.chart)).toContain('after');
    expect(next.queries?.chart?.[0].query).toBe('FROM x | SORT c, d');
  });

  it('keeps panel settings the editor does not expose', () => {
    // The flyout edits the title only, so replacing the entry wholesale would
    // move the panel out of its tab and give a borderless panel a frame back.
    const next = applyPanelEdit(definition(), 'chart', {
      title: 'Renamed',
      messages: [message('after')],
      queries: [],
    });

    expect(next.panels.chart).toEqual({ title: 'Renamed', tab: 'Overview', hideBorder: true });
  });

  it('leaves every other panel untouched', () => {
    const before = definition();
    const next = applyPanelEdit(before, 'chart', {
      title: 'Chart',
      messages: [message('after')],
      queries: [],
    });

    expect(next.panels.other).toEqual(before.panels.other);
    expect(next.surfaces.other).toEqual(before.surfaces.other);
    expect(next.queries?.other).toEqual(before.queries?.other);
  });

  it('drops the queries key when a panel is left with none', () => {
    const next = applyPanelEdit(definition(), 'chart', {
      title: 'Chart',
      messages: [message('after')],
      queries: [],
    });

    expect(next.queries).not.toHaveProperty('chart');
    expect(next.queries).toHaveProperty('other');
  });

  it('adds queries to a panel that had none', () => {
    const base = definition();
    delete base.queries?.chart;

    const next = applyPanelEdit(base, 'chart', {
      title: 'Chart',
      messages: [message('after')],
      queries: [{ path: '/new', shape: 'first', query: 'FROM z' }],
    });

    expect(next.queries?.chart).toEqual([{ path: '/new', shape: 'first', query: 'FROM z' }]);
  });
});

describe('addPanelTo', () => {
  const app = (): CustomAppDefinition =>
    ({
      version: 1,
      title: 'App',
      layout: {
        header: { type: 'panel', id: 'header', row: 0, column: 0, width: 48, height: 3 },
        filters: { type: 'panel', id: 'filters', row: 3, column: 0, width: 48, height: 3 },
        chart: { type: 'panel', id: 'chart', row: 6, column: 0, width: 24, height: 10 },
        table: { type: 'panel', id: 'table', row: 16, column: 0, width: 24, height: 20 },
        logs: { type: 'panel', id: 'logs', row: 6, column: 0, width: 48, height: 12 },
      },
      panels: {
        header: {},
        filters: {},
        chart: { tab: 'Overview' },
        table: { tab: 'Overview' },
        logs: { tab: 'Logs' },
      },
      surfaces: {},
    } as unknown as CustomAppDefinition);

  it('puts the new panel on the tab being looked at', () => {
    // Untabbed, it would land in the persistent strip above the tab bar.
    const next = addPanelTo(app(), 'Overview');
    const added = Object.keys(next.panels).find((id) => !app().panels[id])!;
    expect(next.panels[added].tab).toBe('Overview');
  });

  it('measures the bottom of that tab, not the whole document', () => {
    // The Overview tab ends at 16 + 20 = 36; the Logs tab is irrelevant to it.
    const next = addPanelTo(app(), 'Overview');
    const added = Object.keys(next.layout).find((id) => !app().layout[id])!;
    expect(next.layout[added].row).toBe(36);
  });

  it('starts a shorter tab below only its own panels', () => {
    // Logs ends at 6 + 12 = 18, well above the Overview tab's bottom.
    const next = addPanelTo(app(), 'Logs');
    const added = Object.keys(next.layout).find((id) => !app().layout[id])!;
    expect(next.layout[added].row).toBe(18);
  });

  it('leaves a panel untabbed when the app has no tabs', () => {
    const next = addPanelTo(app(), undefined);
    const added = Object.keys(next.panels).find((id) => !app().panels[id])!;
    expect(next.panels[added].tab).toBeUndefined();
    // Below the persistent panels, which end at 3 + 3 = 6.
    expect(next.layout[added].row).toBe(6);
  });

  it('gives the new panel a surface with exactly one root', () => {
    const next = addPanelTo(app(), 'Overview');
    const added = Object.keys(next.surfaces).find((id) => !app().surfaces[id])!;
    const created = next.surfaces[added][0] as {
      createSurface?: { components?: Array<{ id: string }> };
    };
    expect(created.createSurface?.components?.filter((c) => c.id === 'root')).toHaveLength(1);
  });

  it('never reuses an id that is already taken', () => {
    let current = app();
    const ids = new Set(Object.keys(current.layout));
    for (let i = 0; i < 5; i++) {
      current = addPanelTo(current, 'Overview');
      const added = Object.keys(current.layout).filter((id) => !ids.has(id));
      expect(added).toHaveLength(1);
      ids.add(added[0]);
    }
    expect(ids.size).toBe(10);
  });
});
