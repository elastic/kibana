/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboard, metric, panel, xy } from '../test_helpers';
import { findViolations } from './dashboard_rules';
import type { ChartRuleId } from './chart_rules';

const grid = { x: 0, y: 0, w: 24, h: 10 };

const violationsOf = (rule: ChartRuleId, config: Record<string, unknown>, id = 'p') =>
  findViolations(dashboard([panel(id, grid, config)]), [rule]);

describe('chart rules', () => {
  it('wants no title on metrics and a title on breakdown charts', () => {
    expect(
      findViolations(dashboard([metric('m', grid, undefined, { title: 'Total' })]), [
        'summary_panel_titled',
      ])
    ).toHaveLength(1);
    expect(findViolations(dashboard([metric('m', grid)]), ['summary_panel_titled'])).toEqual([]);
    expect(
      findViolations(dashboard([xy('x', grid, { title: '' })]), ['chart_panel_untitled'])
    ).toHaveLength(1);
    expect(findViolations(dashboard([xy('x', grid)]), ['chart_panel_untitled'])).toEqual([]);
  });

  it('treats an axis title as hidden only when visible is false', () => {
    expect(
      findViolations(
        dashboard([
          xy('x', grid, {
            axis: {
              x: { title: { text: 'Time', visible: false } },
              y: { title: { visible: false } },
            },
          }),
        ]),
        ['xy_axis_title']
      )
    ).toEqual([]);
    const shown = findViolations(
      dashboard([
        xy('x', grid, {
          axis: { x: { title: { text: 'Time' } }, y: { title: { visible: false } } },
        }),
      ]),
      ['xy_axis_title']
    );
    expect(shown[0]?.path).toBe('axis.x.title');
  });

  it('requires a gradient fill only on area layers', () => {
    expect(
      findViolations(dashboard([xy('x', grid, {}, { type: 'area' })]), ['area_solid_fill'])
    ).toHaveLength(1);
    expect(
      findViolations(
        dashboard([xy('x', grid, { styling: { areas: { fill: 'gradient' } } }, { type: 'area' })]),
        ['area_solid_fill']
      )
    ).toEqual([]);
    expect(findViolations(dashboard([xy('x', grid)]), ['area_solid_fill'])).toEqual([]);
  });

  it('wants xy legends outside at the bottom with a visibility set, and pie legends left alone', () => {
    const right = findViolations(dashboard([xy('x', grid, { legend: { position: 'right' } })]), [
      'xy_legend',
    ]);
    expect(right[0]?.detail).toContain('position is right');
    expect(right[0]?.detail).toContain('visibility is unset');
    expect(findViolations(dashboard([xy('x', grid)]), ['xy_legend'])).toEqual([]);
    expect(
      violationsOf('pie_legend_set', { type: 'pie', legend: { visibility: 'visible' } })
    ).toHaveLength(1);
    expect(violationsOf('pie_legend_set', { type: 'pie' })).toEqual([]);
  });

  describe('metric_colors_background', () => {
    const metricWith = (primary: Record<string, unknown>) =>
      violationsOf('metric_colors_background', {
        type: 'metric',
        metrics: [{ type: 'primary', column: 'Value', ...primary }],
      });

    it('reads apply_color_to on the metric entry, not the panel root', () => {
      expect(
        metricWith({ apply_color_to: 'background', color: { type: 'static', color: '#f00' } })[0]
          ?.path
      ).toBe('metrics[0].apply_color_to');
      expect(
        violationsOf('metric_colors_background', {
          type: 'metric',
          apply_color_to: 'background',
          metrics: [{ type: 'primary', column: 'Value' }],
        })
      ).toEqual([]);
    });

    it('treats a defaulted auto color as no color', () => {
      expect(metricWith({ apply_color_to: 'value', color: { type: 'auto' } })[0]?.detail).toContain(
        'without a color'
      );
      expect(metricWith({ apply_color_to: 'value' })).toHaveLength(1);
      expect(
        metricWith({ apply_color_to: 'value', color: { type: 'static', color: '#00f' } })
      ).toEqual([]);
    });
  });

  it('flags legacy palettes anywhere in the config', () => {
    const found = violationsOf('legacy_palette', {
      type: 'pie',
      group_by: [{ column: 'os', color: { mode: 'categorical', palette: 'eui_amsterdam' } }],
    });
    expect(found[0]?.path).toBe('group_by[0].color.palette');
  });

  it('flags static series colors but not reference lines', () => {
    expect(
      findViolations(
        dashboard([
          xy(
            'x',
            grid,
            {},
            { y: [{ column: 'Requests', color: { type: 'static', color: '#f00' } }] }
          ),
        ]),
        ['static_color_override']
      )
    ).toHaveLength(1);
    const withReference = xy('x', grid, {
      layers: [
        {
          type: 'bar',
          data_source: { type: 'esql', query: 'FROM logs | STATS c = COUNT(*)' },
          y: [{ column: 'c' }],
        },
        {
          type: 'reference_lines',
          thresholds: [{ value: 10, color: { type: 'static', color: '#f00' } }],
        },
      ],
    });
    expect(findViolations(dashboard([withReference]), ['static_color_override'])).toEqual([]);
  });

  describe('percent_format_on_0_100', () => {
    const percentMetric = (query: string, column = 'Error rate') =>
      violationsOf('percent_format_on_0_100', {
        type: 'metric',
        data_source: { type: 'esql', query },
        metrics: [{ type: 'primary', column, format: { type: 'percent' } }],
      });

    it('flags a percent format on a column the query already scales to 0–100', () => {
      expect(percentMetric('FROM logs | STATS `Error rate` = 100 * AVG(is_error)')).toHaveLength(1);
      expect(percentMetric('FROM logs | STATS `Error rate` = AVG(is_error) * 100.0')).toHaveLength(
        1
      );
    });

    it('reads the whole expression past commas inside parentheses', () => {
      expect(
        percentMetric(
          'FROM logs | EVAL `Error rate` = ROUND(errors / total, 4) * 100 | KEEP `Error rate`'
        )
      ).toHaveLength(1);
      expect(
        percentMetric('FROM logs | STATS `Error rate` = AVG(x) * 100, other = COUNT(*)')
      ).toHaveLength(1);
    });

    it('accepts a percent format on a 0–1 ratio', () => {
      expect(percentMetric('FROM logs | STATS `Error rate` = AVG(is_error)')).toEqual([]);
      expect(
        percentMetric('FROM logs | STATS `Error rate` = AVG(is_error), total = COUNT(*) * 100')
      ).toEqual([]);
    });
  });
});
