/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterDashboardFindings } from './filter_dashboard_findings';
import type { ControlCatalogEntry, PanelCatalogEntry, SectionCatalogEntry } from './types';

const grid = { x: 0, y: 0, w: 24, h: 12 };

const panel = (id: string, extra?: Partial<PanelCatalogEntry>): PanelCatalogEntry => ({
  id,
  type: 'lens',
  grid,
  ...extra,
});

const packed = (...ids: string[]) => ({
  panels: ids.map((panelId, index) => ({
    panelId,
    grid: { x: (index % 2) * 24, y: Math.floor(index / 2) * 12, w: 24, h: 12 },
  })),
});

const catalog = ({
  panels,
  controls = [],
  sections = [],
}: {
  panels: PanelCatalogEntry[];
  controls?: ControlCatalogEntry[];
  sections?: SectionCatalogEntry[];
}) => ({ panels, controls, sections });

describe('filterDashboardFindings', () => {
  const twoXy = catalog({
    panels: [panel('a', { chart_type: 'xy' }), panel('b', { chart_type: 'xy' })],
  });

  it('keeps a complete in-bounds pack_layout', () => {
    expect(
      filterDashboardFindings({
        ...twoXy,
        findings: [
          {
            rule: 'pack_layout',
            what: 'gap at the fold',
            fix: packed('a', 'b'),
          },
        ],
      })
    ).toEqual([
      {
        rule: 'pack_layout',
        what: 'gap at the fold',
        fix: packed('a', 'b'),
      },
    ]);
  });

  it('drops pack_layout when a catalog panel is missing', () => {
    expect(
      filterDashboardFindings({
        ...twoXy,
        findings: [
          {
            rule: 'pack_layout',
            what: 'gap',
            fix: packed('a'),
          },
        ],
      })
    ).toEqual([]);
  });

  it('drops pack_layout when a panel is duplicated', () => {
    expect(
      filterDashboardFindings({
        ...twoXy,
        findings: [
          {
            rule: 'pack_layout',
            what: 'gap',
            fix: {
              panels: [
                { panelId: 'a', grid: { x: 0, y: 0, w: 24, h: 12 } },
                { panelId: 'a', grid: { x: 24, y: 0, w: 24, h: 12 } },
              ],
            },
          },
        ],
      })
    ).toEqual([]);
  });

  it('drops pack_layout when a grid is out of bounds', () => {
    expect(
      filterDashboardFindings({
        ...twoXy,
        findings: [
          {
            rule: 'pack_layout',
            what: 'gap',
            fix: {
              panels: [
                { panelId: 'a', grid: { x: 40, y: 0, w: 24, h: 12 } },
                { panelId: 'b', grid: { x: 0, y: 12, w: 24, h: 12 } },
              ],
            },
          },
        ],
      })
    ).toEqual([]);
  });

  it('drops pack_layout that would shrink a data table below w 24', () => {
    expect(
      filterDashboardFindings({
        ...catalog({
          panels: [
            panel('table-1', { chart_type: 'data_table' }),
            panel('a', { chart_type: 'xy' }),
          ],
        }),
        findings: [
          {
            rule: 'pack_layout',
            what: 'pack',
            fix: {
              panels: [
                { panelId: 'table-1', grid: { x: 0, y: 0, w: 12, h: 12 } },
                { panelId: 'a', grid: { x: 12, y: 0, w: 36, h: 12 } },
              ],
            },
          },
        ],
      })
    ).toEqual([]);
  });

  it('drops pack_layout that names an unknown section', () => {
    expect(
      filterDashboardFindings({
        ...twoXy,
        findings: [
          {
            rule: 'pack_layout',
            what: 'gap',
            fix: {
              panels: [
                { panelId: 'a', grid: { x: 0, y: 0, w: 24, h: 12 }, sectionId: 'missing' },
                { panelId: 'b', grid: { x: 24, y: 0, w: 24, h: 12 } },
              ],
            },
          },
        ],
      })
    ).toEqual([]);
  });

  it('allows pack_layout section_id from a kept weak_sections plan on a flat dashboard', () => {
    const findings = filterDashboardFindings({
      ...twoXy,
      findings: [
        {
          rule: 'weak_sections',
          what: 'no groups',
          fix: { sections: [{ id: 'section-overview', title: 'Overview', grid: { y: 0 } }] },
        },
        {
          rule: 'pack_layout',
          what: 'pack into the new section',
          fix: {
            panels: [
              {
                panelId: 'a',
                grid: { x: 0, y: 0, w: 24, h: 12 },
                sectionId: 'section-overview',
              },
              {
                panelId: 'b',
                grid: { x: 24, y: 0, w: 24, h: 12 },
                sectionId: 'section-overview',
              },
            ],
          },
        },
      ],
    });

    expect(findings.map((finding) => finding.rule)).toEqual(['weak_sections', 'pack_layout']);
  });

  it('drops weak_sections when the dashboard already has sections', () => {
    expect(
      filterDashboardFindings({
        ...catalog({
          panels: [panel('a', { section_id: 'sec-1' }), panel('b', { section_id: 'sec-1' })],
          sections: [{ id: 'sec-1', title: 'Overview' }],
        }),
        findings: [
          {
            rule: 'weak_sections',
            what: 'rebuild groups',
            fix: { sections: [{ id: 'section-new', title: 'New', grid: { y: 0 } }] },
          },
        ],
      })
    ).toEqual([]);
  });

  it('drops weak_sections with duplicate section ids', () => {
    expect(
      filterDashboardFindings({
        ...twoXy,
        findings: [
          {
            rule: 'weak_sections',
            what: 'groups',
            fix: {
              sections: [
                { id: 'section-overview', title: 'Overview', grid: { y: 0 } },
                { id: 'section-overview', title: 'Also overview', grid: { y: 1 } },
              ],
            },
          },
        ],
      })
    ).toEqual([]);
  });

  it('keeps invert chart-type findings for a known panel', () => {
    expect(
      filterDashboardFindings({
        ...twoXy,
        findings: [
          {
            rule: 'wrong_chart_type',
            panel_id: 'a',
            what: 'pie for a time series',
            fix: { chartType: 'xy' },
          },
        ],
      })
    ).toEqual([
      {
        rule: 'wrong_chart_type',
        panel_id: 'a',
        what: 'pie for a time series',
        fix: { chartType: 'xy' },
      },
    ]);
  });

  it('caps monotone_chart_types at 3 and skips metrics, gauges, and tables', () => {
    const findings = filterDashboardFindings({
      ...catalog({
        panels: [
          panel('m', { chart_type: 'metric' }),
          panel('t', { chart_type: 'data_table' }),
          panel('l1', { chart_type: 'xy' }),
          panel('l2', { chart_type: 'xy' }),
          panel('l3', { chart_type: 'xy' }),
          panel('l4', { chart_type: 'xy' }),
          panel('l5', { chart_type: 'xy' }),
        ],
      }),
      findings: [
        {
          rule: 'monotone_chart_types',
          what: 'all lines',
          fix: {
            changes: [
              { panelId: 'm', chartType: 'xy' },
              { panelId: 't', chartType: 'xy' },
              { panelId: 'l1', chartType: 'bar' },
              { panelId: 'l2', chartType: 'pie' },
              { panelId: 'l3', chartType: 'heatmap' },
              { panelId: 'l4', chartType: 'bar' },
            ],
          },
        },
      ],
    });

    expect(findings).toEqual([
      {
        rule: 'monotone_chart_types',
        what: 'all lines',
        fix: {
          changes: [
            { panelId: 'l1', chartType: 'bar' },
            { panelId: 'l2', chartType: 'pie' },
            { panelId: 'l3', chartType: 'heatmap' },
          ],
        },
      },
    ]);
  });

  it('drops monotone_chart_types when no chart family is a majority', () => {
    expect(
      filterDashboardFindings({
        ...catalog({
          panels: [
            panel('a', { chart_type: 'xy' }),
            panel('b', { chart_type: 'xy' }),
            panel('c', { chart_type: 'pie' }),
            panel('d', { chart_type: 'pie' }),
          ],
        }),
        findings: [
          {
            rule: 'monotone_chart_types',
            what: 'mix',
            fix: { changes: [{ panelId: 'a', chartType: 'bar' }] },
          },
        ],
      })
    ).toEqual([]);
  });

  it('lets invert win when the same panel is also in monotone_chart_types', () => {
    const findings = filterDashboardFindings({
      ...catalog({
        panels: [
          panel('a', { chart_type: 'xy' }),
          panel('b', { chart_type: 'xy' }),
          panel('c', { chart_type: 'xy' }),
        ],
      }),
      findings: [
        {
          rule: 'wrong_chart_type',
          panel_id: 'a',
          what: 'pie for a time series',
          fix: { chartType: 'xy' },
        },
        {
          rule: 'monotone_chart_types',
          what: 'all lines',
          fix: {
            changes: [
              { panelId: 'a', chartType: 'bar' },
              { panelId: 'b', chartType: 'pie' },
            ],
          },
        },
      ],
    });

    expect(findings).toEqual([
      {
        rule: 'wrong_chart_type',
        panel_id: 'a',
        what: 'pie for a time series',
        fix: { chartType: 'xy' },
      },
      {
        rule: 'monotone_chart_types',
        what: 'all lines',
        fix: { changes: [{ panelId: 'b', chartType: 'pie' }] },
      },
    ]);
  });

  it('keeps weak_controls adds that match catalog ES|QL when there are fewer than 2 dropdowns', () => {
    expect(
      filterDashboardFindings({
        ...catalog({
          panels: [
            panel('a', {
              chart_type: 'xy',
              esql: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
            }),
          ],
        }),
        findings: [
          {
            rule: 'weak_controls',
            what: 'no host filter',
            fix: {
              controls: [
                {
                  type: 'options_list_control',
                  field_name: 'host.name',
                  index: 'logs-*',
                  title: 'Host',
                },
              ],
            },
          },
        ],
      })
    ).toEqual([
      {
        rule: 'weak_controls',
        what: 'no host filter',
        fix: {
          controls: [
            {
              type: 'options_list_control',
              field_name: 'host.name',
              index: 'logs-*',
              title: 'Host',
            },
          ],
        },
      },
    ]);
  });

  it('drops weak_controls when two dropdowns already exist or the field is not in catalog ES|QL', () => {
    expect(
      filterDashboardFindings({
        ...catalog({
          panels: [
            panel('a', {
              chart_type: 'xy',
              esql: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
            }),
          ],
          controls: [
            { id: 'c1', type: 'options_list_control', title: 'Host' },
            { id: 'c2', type: 'options_list_control', title: 'Env' },
          ],
        }),
        findings: [
          {
            rule: 'weak_controls',
            what: 'add region',
            fix: {
              controls: [
                { type: 'options_list_control', field_name: 'host.name', index: 'logs-*' },
              ],
            },
          },
        ],
      })
    ).toEqual([]);

    expect(
      filterDashboardFindings({
        ...catalog({
          panels: [
            panel('a', {
              chart_type: 'xy',
              esql: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
            }),
          ],
        }),
        findings: [
          {
            rule: 'weak_controls',
            what: 'invented',
            fix: {
              controls: [{ type: 'options_list_control', field_name: 'region', index: 'logs-*' }],
            },
          },
        ],
      })
    ).toEqual([]);
  });

  it('keeps duplicate_inner_title when the chrome title is still visible', () => {
    expect(
      filterDashboardFindings({
        ...twoXy,
        findings: [
          {
            rule: 'duplicate_inner_title',
            panel_id: 'a',
            what: 'panel chrome and inner metric both say Requests',
            fix: { hide_title: true },
          },
        ],
      })
    ).toEqual([
      {
        rule: 'duplicate_inner_title',
        panel_id: 'a',
        what: 'panel chrome and inner metric both say Requests',
        fix: { hide_title: true },
      },
    ]);
  });

  it('drops duplicate_inner_title when hide_title is already set or the panel is unknown', () => {
    expect(
      filterDashboardFindings({
        ...catalog({ panels: [panel('a', { chart_type: 'metric', hide_title: true })] }),
        findings: [
          {
            rule: 'duplicate_inner_title',
            panel_id: 'a',
            what: 'already hidden',
            fix: { hide_title: true },
          },
        ],
      })
    ).toEqual([]);

    expect(
      filterDashboardFindings({
        ...twoXy,
        findings: [
          {
            rule: 'duplicate_inner_title',
            panel_id: 'missing',
            what: 'unknown panel',
            fix: { hide_title: true },
          },
        ],
      })
    ).toEqual([]);
  });

  it('keeps one_category_chart for a known xy panel targeting metric or pie', () => {
    expect(
      filterDashboardFindings({
        ...twoXy,
        findings: [
          {
            rule: 'one_category_chart',
            panel_id: 'a',
            what: 'one bar for a single host',
            fix: { chartType: 'metric' },
          },
        ],
      })
    ).toEqual([
      {
        rule: 'one_category_chart',
        panel_id: 'a',
        what: 'one bar for a single host',
        fix: { chartType: 'metric' },
      },
    ]);
  });

  it('drops one_category_chart that is already a metric/pie, unknown, or a non-metric/pie target', () => {
    expect(
      filterDashboardFindings({
        ...catalog({ panels: [panel('m', { chart_type: 'metric' })] }),
        findings: [
          {
            rule: 'one_category_chart',
            panel_id: 'm',
            what: 'already a metric',
            fix: { chartType: 'pie' },
          },
        ],
      })
    ).toEqual([]);

    expect(
      filterDashboardFindings({
        ...twoXy,
        findings: [
          {
            rule: 'one_category_chart',
            panel_id: 'missing',
            what: 'unknown',
            fix: { chartType: 'metric' },
          },
          {
            rule: 'one_category_chart',
            panel_id: 'a',
            what: 'not a one-category target',
            fix: { chartType: 'bar' },
          },
        ],
      })
    ).toEqual([]);
  });

  it('caps one_category_chart at 3 and lets invert win on the same panel', () => {
    const findings = filterDashboardFindings({
      ...catalog({
        panels: [
          panel('a', { chart_type: 'xy' }),
          panel('b', { chart_type: 'xy' }),
          panel('c', { chart_type: 'xy' }),
          panel('d', { chart_type: 'xy' }),
          panel('e', { chart_type: 'xy' }),
        ],
      }),
      findings: [
        {
          rule: 'wrong_chart_type',
          panel_id: 'a',
          what: 'pie for a time series',
          fix: { chartType: 'xy' },
        },
        {
          rule: 'one_category_chart',
          panel_id: 'a',
          what: 'one bar',
          fix: { chartType: 'metric' },
        },
        {
          rule: 'one_category_chart',
          panel_id: 'b',
          what: 'one bar',
          fix: { chartType: 'metric' },
        },
        {
          rule: 'one_category_chart',
          panel_id: 'c',
          what: 'one bar',
          fix: { chartType: 'pie' },
        },
        {
          rule: 'one_category_chart',
          panel_id: 'd',
          what: 'one bar',
          fix: { chartType: 'metric' },
        },
        {
          rule: 'one_category_chart',
          panel_id: 'e',
          what: 'one bar',
          fix: { chartType: 'metric' },
        },
        {
          rule: 'monotone_chart_types',
          what: 'all lines',
          fix: {
            changes: [
              { panelId: 'b', chartType: 'heatmap' },
              { panelId: 'e', chartType: 'bar' },
            ],
          },
        },
      ],
    });

    expect(findings).toEqual([
      {
        rule: 'wrong_chart_type',
        panel_id: 'a',
        what: 'pie for a time series',
        fix: { chartType: 'xy' },
      },
      {
        rule: 'one_category_chart',
        panel_id: 'b',
        what: 'one bar',
        fix: { chartType: 'metric' },
      },
      {
        rule: 'one_category_chart',
        panel_id: 'c',
        what: 'one bar',
        fix: { chartType: 'pie' },
      },
      {
        rule: 'one_category_chart',
        panel_id: 'd',
        what: 'one bar',
        fix: { chartType: 'metric' },
      },
      {
        rule: 'monotone_chart_types',
        what: 'all lines',
        fix: { changes: [{ panelId: 'e', chartType: 'bar' }] },
      },
    ]);
  });

  it('keeps metric_fill only for a metric whose catalog apply_color_to is background', () => {
    expect(
      filterDashboardFindings({
        ...catalog({
          panels: [panel('m', { chart_type: 'metric', apply_color_to: 'background' })],
        }),
        findings: [
          {
            rule: 'metric_fill',
            panel_id: 'm',
            what: 'mustard background',
            fix: { clear_metric_fill: true },
          },
        ],
      })
    ).toEqual([
      {
        rule: 'metric_fill',
        panel_id: 'm',
        what: 'mustard background',
        fix: { clear_metric_fill: true },
      },
    ]);
  });

  it('drops metric_fill when the panel is not a filled metric', () => {
    expect(
      filterDashboardFindings({
        ...catalog({
          panels: [
            panel('m', { chart_type: 'metric', apply_color_to: 'value' }),
            panel('xy', { chart_type: 'xy' }),
          ],
        }),
        findings: [
          {
            rule: 'metric_fill',
            panel_id: 'm',
            what: 'value color is not fill',
            fix: { clear_metric_fill: true },
          },
          {
            rule: 'metric_fill',
            panel_id: 'xy',
            what: 'not a metric',
            fix: { clear_metric_fill: true },
          },
        ],
      })
    ).toEqual([]);
  });

  it('keeps thin_metric trendline on sparse metrics and caps at 4', () => {
    const findings = filterDashboardFindings({
      ...catalog({
        panels: [
          panel('m1', { chart_type: 'metric' }),
          panel('m2', { chart_type: 'metric' }),
          panel('m3', { chart_type: 'metric' }),
          panel('m4', { chart_type: 'metric' }),
          panel('m5', { chart_type: 'metric' }),
          panel('rich', {
            chart_type: 'metric',
            has_secondary_metric: true,
            background_chart: 'trend',
          }),
          panel('xy', { chart_type: 'xy' }),
        ],
      }),
      findings: [
        {
          rule: 'thin_metric',
          panel_id: 'm1',
          what: 'empty KPI',
          fix: { metric_trendline: true },
        },
        {
          rule: 'thin_metric',
          panel_id: 'm2',
          what: 'empty KPI',
          fix: { metric_trendline: true },
        },
        {
          rule: 'thin_metric',
          panel_id: 'm3',
          what: 'empty KPI',
          fix: { metric_trendline: true },
        },
        {
          rule: 'thin_metric',
          panel_id: 'm4',
          what: 'empty KPI',
          fix: { metric_trendline: true },
        },
        {
          rule: 'thin_metric',
          panel_id: 'm5',
          what: 'empty KPI',
          fix: { metric_trendline: true },
        },
        {
          rule: 'thin_metric',
          panel_id: 'rich',
          what: 'already enhanced',
          fix: { metric_trendline: true },
        },
        {
          rule: 'thin_metric',
          panel_id: 'xy',
          what: 'not a metric',
          fix: { metric_trendline: true },
        },
      ],
    });

    expect(findings).toEqual([
      {
        rule: 'thin_metric',
        panel_id: 'm1',
        what: 'empty KPI',
        fix: { metric_trendline: true },
      },
      {
        rule: 'thin_metric',
        panel_id: 'm2',
        what: 'empty KPI',
        fix: { metric_trendline: true },
      },
      {
        rule: 'thin_metric',
        panel_id: 'm3',
        what: 'empty KPI',
        fix: { metric_trendline: true },
      },
      {
        rule: 'thin_metric',
        panel_id: 'm4',
        what: 'empty KPI',
        fix: { metric_trendline: true },
      },
    ]);
  });

  it('drops unknown rules and keeps other valid findings when pack_layout is dropped', () => {
    expect(
      filterDashboardFindings({
        ...twoXy,
        findings: [
          { rule: 'disproportionate_size', panel_id: 'a', what: 'too wide', fix: '{w:12}' },
          {
            rule: 'pack_layout',
            what: 'partial',
            fix: packed('a'),
          },
          {
            rule: 'wrong_chart_type',
            panel_id: 'b',
            what: 'pie for a time series',
            fix: { chartType: 'xy' },
          },
        ],
      })
    ).toEqual([
      {
        rule: 'wrong_chart_type',
        panel_id: 'b',
        what: 'pie for a time series',
        fix: { chartType: 'xy' },
      },
    ]);
  });
});
