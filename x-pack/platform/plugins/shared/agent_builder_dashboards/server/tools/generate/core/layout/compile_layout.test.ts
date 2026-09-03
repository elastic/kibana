/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel, DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';
import { compileLayout } from './compile_layout';
import { deriveRowsFromGrid, getGridLayout, getOrderedLayout } from './derive_rows_from_grid';
import { markdownHeight } from './markdown_height';

const panelKeys = new Map<string, string>();

const vis = (
  id: string,
  type: string,
  grid: AttachmentPanel['grid'] = { x: 0, y: 0, w: 12, h: 5 }
): AttachmentPanel => ({
  id,
  type: LENS_EMBEDDABLE_TYPE,
  config: { type },
  grid,
});

const markdown = (
  id: string,
  content: string,
  grid: AttachmentPanel['grid'] = { x: 0, y: 0, w: 48, h: 4 }
): AttachmentPanel => ({
  id,
  type: MARKDOWN_EMBEDDABLE_TYPE,
  config: { content },
  grid,
});

const dashboardOf = (panels: DashboardAttachmentData['panels']): DashboardAttachmentData => ({
  title: 'Layout',
  panels,
});

const widthsOf = (panels: AttachmentPanel[]): number[] => panels.map((panel) => panel.grid.w);

const topPanels = (data: DashboardAttachmentData): AttachmentPanel[] =>
  data.panels.filter((widget): widget is AttachmentPanel => !('panels' in widget));

describe('compileLayout', () => {
  it('equal-splits five metrics as 10,10,10,9,9', () => {
    const ids = ['m1', 'm2', 'm3', 'm4', 'm5'];
    const result = compileLayout({
      dashboard: dashboardOf(ids.map((id) => vis(id, 'metric'))),
      spec: { rows: [ids] },
      panelKeys,
    });

    expect(widthsOf(topPanels(result.dashboard))).toEqual([10, 10, 10, 9, 9]);
    expect(topPanels(result.dashboard).every((panel) => panel.grid.h === 5)).toBe(true);
  });

  it('equal-splits seven metrics as 7,7,7,7,7,7,6', () => {
    const ids = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'];
    const result = compileLayout({
      dashboard: dashboardOf(ids.map((id) => vis(id, 'metric'))),
      spec: { rows: [ids] },
      panelKeys,
    });

    expect(widthsOf(topPanels(result.dashboard))).toEqual([7, 7, 7, 7, 7, 7, 6]);
  });

  it('lays out four metrics, two xy charts, and a table', () => {
    const result = compileLayout({
      dashboard: dashboardOf([
        vis('m1', 'metric'),
        vis('m2', 'metric'),
        vis('m3', 'metric'),
        vis('m4', 'metric'),
        vis('xy1', 'xy'),
        vis('xy2', 'xy'),
        vis('table', 'data_table'),
      ]),
      spec: {
        rows: [
          ['m1', 'm2', 'm3', 'm4'],
          ['xy1', 'xy2'],
          ['table'],
        ],
      },
      panelKeys,
    });

    const panels = Object.fromEntries(
      topPanels(result.dashboard).map((panel) => [panel.id, panel.grid])
    );

    expect(panels.m1).toEqual({ x: 0, y: 0, w: 12, h: 5 });
    expect(panels.m2).toEqual({ x: 12, y: 0, w: 12, h: 5 });
    expect(panels.m3).toEqual({ x: 24, y: 0, w: 12, h: 5 });
    expect(panels.m4).toEqual({ x: 36, y: 0, w: 12, h: 5 });
    expect(panels.xy1).toEqual({ x: 0, y: 5, w: 24, h: 10 });
    expect(panels.xy2).toEqual({ x: 24, y: 5, w: 24, h: 10 });
    expect(panels.table).toEqual({ x: 0, y: 15, w: 48, h: 14 });
  });

  it.each(['metric', 'gauge', 'pie'] as const)(
    'keeps a lone %s at default width and x 0 instead of stretching',
    (type) => {
      const result = compileLayout({
        dashboard: dashboardOf([vis('lone', type)]),
        spec: { rows: [['lone']] },
        panelKeys,
      });

      const [panel] = topPanels(result.dashboard);
      expect(panel.grid.x).toBe(0);
      expect(panel.grid.w).toBe(type === 'pie' ? 12 : type === 'gauge' ? 12 : 12);
      expect(panel.grid.w).toBeLessThan(48);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            panelId: 'lone',
            message: 'lone metric/gauge/pie uses default width',
          }),
        ])
      );
    }
  );

  it('uses markdownHeight for markdown panel height', () => {
    const content = '# Title\n\nsecond\nthird\nfourth';
    const result = compileLayout({
      dashboard: dashboardOf([markdown('md', content)]),
      spec: { rows: [['md']] },
      panelKeys,
    });

    expect(topPanels(result.dashboard)[0].grid.h).toBe(markdownHeight(content));
    expect(topPanels(result.dashboard)[0].grid.w).toBe(48);
  });

  it('creates a section from keys and places its panels from y 0', () => {
    const keys = new Map([
      ['kpi', 'kpi-id'],
      ['chart', 'chart-id'],
    ]);
    const result = compileLayout({
      dashboard: dashboardOf([vis('kpi-id', 'metric'), vis('chart-id', 'xy')]),
      spec: {
        sections: [{ key: 'overview', title: 'Overview', rows: [['kpi', 'chart']] }],
      },
      panelKeys: keys,
    });

    const section = result.dashboard.panels[0];
    expect('panels' in section).toBe(true);
    if (!('panels' in section)) {
      return;
    }
    expect(section.title).toBe('Overview');
    expect(section.grid).toEqual({ y: 0 });
    expect(section.panels[0].grid.y).toBe(0);
    expect(section.panels[1].grid.y).toBe(0);
    expect(result.mintedKeys.get('overview')).toBe(section.id);
  });

  it('records a failure for a missing ref and compiles the rest of the row', () => {
    const result = compileLayout({
      dashboard: dashboardOf([vis('m1', 'metric'), vis('m2', 'metric')]),
      spec: { rows: [['m1', 'missing', 'm2']] },
      panelKeys,
    });

    expect(result.failures).toEqual([
      expect.objectContaining({
        type: 'set_layout',
        identifier: 'missing',
        error: 'Panel "missing" was not found.',
      }),
    ]);
    expect(topPanels(result.dashboard).map((panel) => panel.id)).toEqual(['m1', 'm2']);
  });

  it('records a failure for a duplicate ref and does not place it twice', () => {
    const result = compileLayout({
      dashboard: dashboardOf([vis('m1', 'metric'), vis('m2', 'metric')]),
      spec: { rows: [['m1', 'm2'], ['m1']] },
      panelKeys,
    });

    expect(result.failures).toEqual([
      expect.objectContaining({
        type: 'set_layout',
        identifier: 'm1',
        error: 'Panel "m1" is referenced more than once.',
      }),
    ]);
    expect(topPanels(result.dashboard).filter((panel) => panel.id === 'm1')).toHaveLength(1);
  });

  it('appends unreferenced panels and warns they were not placed by layout', () => {
    const result = compileLayout({
      dashboard: dashboardOf([
        vis('kept', 'xy', { x: 0, y: 0, w: 24, h: 10 }),
        vis('extra', 'metric', { x: 0, y: 20, w: 12, h: 5 }),
      ]),
      spec: { rows: [['kept']] },
      panelKeys,
    });

    expect(topPanels(result.dashboard).map((panel) => panel.id)).toEqual(['kept', 'extra']);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        { panelId: 'extra', message: 'panels not placed by layout' },
      ])
    );
  });

  it('is idempotent: compile(deriveRows(compile(L))) equals compile(L)', () => {
    const spec = {
      rows: [
        ['m1', 'm2', 'm3', 'm4'],
        ['xy1', 'xy2'],
        ['table'],
      ],
    };
    const source = dashboardOf([
      vis('m1', 'metric'),
      vis('m2', 'metric'),
      vis('m3', 'metric'),
      vis('m4', 'metric'),
      vis('xy1', 'xy'),
      vis('xy2', 'xy'),
      vis('table', 'data_table'),
    ]);

    const compiled = compileLayout({ dashboard: source, spec, panelKeys });
    const recompiled = compileLayout({
      dashboard: compiled.dashboard,
      spec: deriveRowsFromGrid(compiled.dashboard),
      panelKeys,
    });

    expect(getGridLayout(recompiled.dashboard)).toEqual(getGridLayout(compiled.dashboard));
  });

  it('is a fixed point: compiling the ordered layout reproduces the compiled grids', () => {
    const compiled = compileLayout({
      dashboard: dashboardOf([vis('a', 'metric'), vis('b', 'xy'), vis('c', 'data_table')]),
      spec: { rows: [['a', 'b'], ['c']] },
      panelKeys,
    });

    const again = compileLayout({
      dashboard: compiled.dashboard,
      spec: getOrderedLayout(compiled.dashboard),
      panelKeys,
    });

    expect(getGridLayout(again.dashboard)).toEqual(getGridLayout(compiled.dashboard));
  });

  it('does not reorder panels when auto is true', () => {
    const source = dashboardOf([
      vis('b', 'metric', { x: 12, y: 0, w: 12, h: 5 }),
      vis('a', 'metric', { x: 0, y: 0, w: 12, h: 5 }),
      vis('c', 'xy', { x: 0, y: 10, w: 24, h: 10 }),
    ]);

    const result = compileLayout({
      dashboard: source,
      spec: { auto: true },
      panelKeys,
    });

    expect(result.rows).toEqual([
      ['a', 'b'],
      ['c'],
    ]);
  });

  it('packs implicit panels without grid as one equal-split row', () => {
    const ids = ['m1', 'm2', 'm3', 'm4'];
    const result = compileLayout({
      dashboard: dashboardOf(
        ids.map((id, index) => vis(id, 'metric', { x: 0, y: index * 10, w: 24, h: 10 }))
      ),
      spec: { implicitPanelIds: ids },
      panelKeys,
    });

    expect(result.rows).toEqual([ids]);
    expect(widthsOf(topPanels(result.dashboard))).toEqual([12, 12, 12, 12]);
  });
});
