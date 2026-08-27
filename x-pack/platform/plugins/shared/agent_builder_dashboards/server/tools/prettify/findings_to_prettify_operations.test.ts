/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import { findingsToPrettifyOperations } from './findings_to_prettify_operations';
import type { DashboardFinding } from '../review_dashboard/types';

const grid = { x: 0, y: 0, w: 12, h: 5 };

describe('findingsToPrettifyOperations', () => {
  it('returns no operations when there are no findings', () => {
    expect(findingsToPrettifyOperations([])).toEqual([]);
  });

  it('turns a complete pack_layout into one update_panel_layouts', () => {
    const findings: DashboardFinding[] = [
      {
        rule: 'pack_layout',
        what: 'KPIs are stretched',
        fix: {
          panels: [
            { panel_id: 'kpi-1', grid },
            { panel_id: 'kpi-2', grid: { x: 12, y: 0, w: 12, h: 5 } },
          ],
        },
      },
    ];

    expect(findingsToPrettifyOperations(findings)).toEqual([
      {
        operation: 'update_panel_layouts',
        panels: [
          { panelId: 'kpi-1', grid },
          { panelId: 'kpi-2', grid: { x: 12, y: 0, w: 12, h: 5 } },
        ],
      },
    ]);
  });

  it('merges hide_title, clear_metric_fill, and metric_trendline onto the pack entries', () => {
    const findings: DashboardFinding[] = [
      {
        rule: 'pack_layout',
        what: 'pack',
        fix: { panels: [{ panel_id: 'kpi-1', grid }] },
      },
      {
        rule: 'duplicate_inner_title',
        panel_id: 'kpi-1',
        what: 'chrome repeats the inner title',
        fix: { hide_title: true },
      },
      {
        rule: 'metric_fill',
        panel_id: 'kpi-1',
        what: 'mustard background',
        fix: { clear_background: true },
      },
      {
        rule: 'thin_metric',
        panel_id: 'kpi-1',
        what: 'lone number',
        fix: { enhance: 'trendline' },
      },
    ];

    expect(findingsToPrettifyOperations(findings)).toEqual([
      {
        operation: 'update_panel_layouts',
        panels: [
          {
            panelId: 'kpi-1',
            grid,
            hide_title: true,
            clear_metric_fill: true,
            metric_trendline: true,
          },
        ],
      },
    ]);
  });

  it('adds sections first, then packs panels into those section ids', () => {
    const findings: DashboardFinding[] = [
      {
        rule: 'weak_sections',
        what: 'flat canvas',
        fix: {
          sections: [
            { id: 'section-overview', title: 'Overview', panel_ids: ['kpi-1'] },
            { id: 'section-traffic', title: 'Traffic', panel_ids: ['xy-1'] },
          ],
        },
      },
      {
        rule: 'pack_layout',
        what: 'move into sections',
        fix: {
          panels: [
            { panel_id: 'kpi-1', grid, section_id: 'section-overview' },
            { panel_id: 'xy-1', grid: { x: 0, y: 0, w: 48, h: 10 }, section_id: 'section-traffic' },
          ],
        },
      },
    ];

    expect(findingsToPrettifyOperations(findings)).toEqual([
      {
        operation: 'add_section',
        id: 'section-overview',
        title: 'Overview',
        grid: { y: 0 },
      },
      {
        operation: 'add_section',
        id: 'section-traffic',
        title: 'Traffic',
        grid: { y: 1 },
      },
      {
        operation: 'update_panel_layouts',
        panels: [
          { panelId: 'kpi-1', grid, sectionId: 'section-overview' },
          {
            panelId: 'xy-1',
            grid: { x: 0, y: 0, w: 48, h: 10 },
            sectionId: 'section-traffic',
          },
        ],
      },
    ]);
  });

  it('orders edit_panels as invert, then one_category, then variety', () => {
    const findings: DashboardFinding[] = [
      {
        rule: 'monotone_chart_types',
        what: 'all lines',
        fix: { changes: [{ panel_id: 'bar-1', chartType: 'heatmap' }] },
      },
      {
        rule: 'one_category_chart',
        panel_id: 'cat-1',
        what: 'one bar',
        fix: { chartType: 'metric' },
      },
      {
        rule: 'wrong_chart_type',
        panel_id: 'pie-1',
        what: 'pie of a time series',
        fix: { chartType: 'xy' },
      },
    ];

    const operations = findingsToPrettifyOperations(findings);
    expect(operations).toHaveLength(1);
    const edit = operations[0];
    expect(edit).toMatchObject({ operation: 'edit_panels' });
    if (edit.operation !== 'edit_panels') {
      throw new Error('expected edit_panels');
    }
    expect(edit.panels.map((panel) => panel.panelId)).toEqual(['pie-1', 'cat-1', 'bar-1']);
    expect(edit.panels.map((panel) => 'chartType' in panel && panel.chartType)).toEqual([
      'xy',
      'metric',
      'heatmap',
    ]);
  });

  it('appends add_controls after layout and chart-type edits', () => {
    const findings: DashboardFinding[] = [
      {
        rule: 'pack_layout',
        what: 'pack',
        fix: { panels: [{ panel_id: 'kpi-1', grid }] },
      },
      {
        rule: 'weak_controls',
        what: 'no dropdowns',
        fix: {
          add: [{ type: OPTIONS_LIST_CONTROL, field_name: 'host.name', index: 'logs-*' }],
        },
      },
    ];

    const operations = findingsToPrettifyOperations(findings);
    expect(operations.map((operation) => operation.operation)).toEqual([
      'update_panel_layouts',
      'add_controls',
    ]);
    expect(operations[1]).toEqual({
      operation: 'add_controls',
      controls: [{ type: OPTIONS_LIST_CONTROL, field_name: 'host.name', index: 'logs-*' }],
    });
  });
});
