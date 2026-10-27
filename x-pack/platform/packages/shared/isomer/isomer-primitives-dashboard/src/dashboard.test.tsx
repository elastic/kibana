/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKibanaIsomerRuntime } from '@kbn/isomer';
import { componentsPack } from '@kbn/isomer-components';
import { borealisDark, borealisLight, kibanaCardFrame } from '@kbn/isomer-theme';

import type { PrimitiveNode } from '@elastic/isomer-sdk';

import { type DashboardNode, dashboardChartSize, dashboardPack } from './dashboard';
import { DASHBOARD_FRAME, dashboardFrame } from './frame';
import { PANEL_CHROME, panelBodySize } from './geometry';

const runtime = createKibanaIsomerRuntime({ packs: [componentsPack, dashboardPack] });

const node: DashboardNode = {
  type: 'dashboard',
  title: 'Traffic',
  period: 'Oct 13 – Oct 20, 2026',
  panels: [
    {
      id: 'right',
      title: 'Right',
      grid: { x: 24, y: 0, w: 24, h: 10 },
      body: { type: 'markdown', text: 'second' } as never,
    },
    {
      id: 'left',
      title: 'Left',
      grid: { x: 0, y: 0, w: 24, h: 10 },
      body: { id: 'chart-1', type: 'markdown', text: 'first' } as never,
    },
    {
      id: 'below',
      grid: { x: 0, y: 10, w: 48, h: 6 },
      placeholder: {
        reason: 'No node for this panel',
        href: 'https://kibana.example/app/dashboards',
      },
    },
  ],
};
const view = (dashboard: DashboardNode) => ({ type: 'view' as const, body: [dashboard] });

describe('dashboard', () => {
  it('validates its examples and a converted dashboard', () => {
    for (const example of dashboardPack.primitives[0].examples) {
      expect(runtime.validate(view(example as DashboardNode)).errors).toEqual([]);
    }
    expect(runtime.validate(view(node)).errors).toEqual([]);
  });

  it('rejects a panel off the grid', () => {
    const off = { ...node, panels: [{ ...node.panels[0], grid: { x: 48, y: 0, w: 1, h: 1 } }] };
    expect(runtime.validate(view(off)).errors.map(({ path }) => path)).toEqual([
      'body[0].panels[0].grid.x',
    ]);
  });

  it('lays panels out on the grid by percent and rows', () => {
    const { html } = runtime.surfaces.html.render(view(node));
    expect(html).toContain('data-layout="grid"');
    expect(html).toMatch(/left:50%;top:0(px)?;width:50%;height:280px/);
    expect(html).toContain('Open in Kibana');
  });

  it('stacks panels in reading order', () => {
    const { html } = runtime.surfaces.html.render(view({ ...node, layout: 'stack' }));
    expect(html).toContain('data-layout="stack"');
    expect(html.indexOf('first')).toBeLessThan(html.indexOf('second'));
  });

  it('reads as text in reading order, placeholders included', () => {
    expect(runtime.surfaces.text.render(view(node))).toBe(
      'Traffic\n\nOct 13 – Oct 20, 2026\n\nLeft\nfirst\n\nRight\nsecond\n\nNo node for this panel'
    );
  });

  it('sizes a chart for its panel body', () => {
    const sizeFor = dashboardChartSize(1200);
    const chart = { id: 'chart-1', type: 'markdown' };
    expect(sizeFor(chart, [node])).toEqual({ width: 578, height: 226 });
    const stacked: DashboardNode = { ...node, layout: 'stack' };
    expect(sizeFor(chart, [stacked])).toEqual({ width: 1182, height: 226 });
    expect(sizeFor({ id: 'elsewhere' }, [node])).toBeUndefined();
  });

  it('draws on snapshot at its estimated height', () => {
    const { height, html } = runtime.surfaces.snapshot.render(view(node), { width: 1200 });
    expect(html).toContain('Traffic');
    expect(height).toBeGreaterThan(16 * 28);
  });

  it('lets a frameless body fill its panel', () => {
    const frameless: DashboardNode = {
      ...node,
      panels: [{ ...node.panels[1], title: undefined, frame: 'none' }],
    };
    expect(runtime.validate(view(frameless)).errors).toEqual([]);
    expect(dashboardChartSize(1200)({ id: 'chart-1' }, [frameless])).toEqual({
      width: 596,
      height: 272,
    });
    const { html } = runtime.surfaces.html.render(view(frameless));
    expect(html).not.toContain('isomerDashboard-panel ');
  });
});

describe('panelBodySize', () => {
  it('is the box every node in a panel draws in, the size charts are drawn at', () => {
    const grid = { x: 24, y: 0, w: 24, h: 10 };
    const content = { id: 'a', type: 'markdown' } as PrimitiveNode;
    const owner = {
      type: 'dashboard',
      title: 'D',
      panels: [{ id: 'a', grid, title: 'A', body: content }],
    } as unknown as PrimitiveNode;
    const body = panelBodySize({ grid, titled: true }, { width: 1200 });
    expect(dashboardChartSize(1200)(content, [owner])).toEqual(body);
    expect(panelBodySize({ grid, titled: false }, { width: 1200 }).height).toBe(
      body.height + PANEL_CHROME.header
    );
  });
});

describe('dashboardFrame', () => {
  it('draws the dashboard on Kibana’s recessed page, in either theme, without a card around it', () => {
    const framed = createKibanaIsomerRuntime({
      packs: [componentsPack, dashboardPack],
      frames: { card: kibanaCardFrame, [DASHBOARD_FRAME]: dashboardFrame },
      defaultFrame: 'card',
    });
    const [example] = dashboardPack.primitives[0].examples;
    for (const theme of ['light', 'dark'] as const) {
      const { html } = framed.surfaces.snapshot.render(
        { type: 'view', body: [example as PrimitiveNode] },
        { frame: DASHBOARD_FRAME, width: 1200, theme }
      );
      expect(html).toContain(
        (theme === 'light' ? borealisLight : borealisDark).color.background.recessed
      );
    }
  });
});
