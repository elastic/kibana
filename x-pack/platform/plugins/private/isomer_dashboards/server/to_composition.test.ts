/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConvertedDashboard } from '@kbn/isomer-lowering';

import { periodOf, toDashboardComposition } from './to_composition';

const grid = { x: 0, y: 0, w: 24, h: 10 };

const converted: ConvertedDashboard = {
  id: 'dash',
  title: 'Traffic',
  timeRange: { from: '2026-10-13T00:00:00.000Z', to: '2026-10-20T00:00:00.000Z' },
  diagnostics: [],
  panels: [
    {
      panelId: 'xy',
      title: 'Requests',
      grid,
      kind: 'xy',
      outcome: { status: 'converted', nodeType: 'xyChart' },
      node: { id: 'xy', type: 'xyChart', title: 'Requests' },
      hint: { legend: { isVisible: false } },
    },
    {
      panelId: 'metric',
      title: 'Visitors',
      grid,
      kind: 'metric',
      outcome: { status: 'converted', nodeType: 'metricTrend' },
      node: { id: 'metric', type: 'metricTrend', title: 'Visitors' },
    },
    {
      panelId: 'search',
      title: 'Raw logs',
      grid,
      kind: 'search',
      outcome: { status: 'outside', reason: 'search panel' },
    },
    {
      panelId: 'bad',
      grid,
      kind: 'markdown',
      outcome: { status: 'converted', nodeType: 'markdown' },
      node: { id: 'bad', type: 'markdown', text: '' },
    },
  ],
};

describe('toDashboardComposition', () => {
  const { composition, hints } = toDashboardComposition(converted, {
    layout: 'grid',
    href: 'https://kibana.example/app/dashboards#/view/dash',
    valid: (node) => (node.type === 'markdown' && node.text === '' ? 'text: empty' : undefined),
  });
  const [{ panels, period }] = composition.body;

  it('moves a chart’s title to its panel, unless the chart draws its own; every panel keeps its frame', () => {
    expect(panels[0]).toMatchObject({ title: 'Requests', body: { type: 'xyChart' } });
    expect(panels[0].body).not.toHaveProperty('title');
    expect(panels[1]).not.toHaveProperty('title');
    expect(panels[1]).toMatchObject({ body: { title: 'Visitors' } });
    expect(panels.filter((panel) => 'frame' in panel)).toEqual([]);
  });

  it('gives panels without a node, or with an invalid one, a linked placeholder', () => {
    expect(panels[2]).toMatchObject({
      title: 'Raw logs',
      placeholder: {
        reason: 'Isomer has no node for this panel yet (search panel).',
        href: 'https://kibana.example/app/dashboards#/view/dash',
      },
    });
    expect(panels[3].placeholder?.reason).toBe("Isomer couldn't validate this panel: text: empty");
  });

  it('keeps hints for drawn panels and words the period', () => {
    expect(hints).toEqual({ xy: { legend: { isVisible: false } } });
    expect(period).toBe('Oct 13, 2026 – Oct 20, 2026');
    expect(periodOf({ timeRange: { from: 'now-7d', to: 'now' } })).toBeUndefined();
  });
});
