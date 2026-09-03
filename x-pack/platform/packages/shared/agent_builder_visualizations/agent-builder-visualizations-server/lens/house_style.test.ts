/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { applyHouseStyle } from './house_style';

const defects = {
  mode: 'normalize' as const,
  rules: 'defects' as const,
  colors: 'keep' as const,
};

describe('applyHouseStyle', () => {
  it('hides chrome titles on metrics without breakdown (T1)', () => {
    const result = applyHouseStyle(
      { type: 'metric', title: 'Total requests', metrics: [{ type: 'primary', column: 'count' }] },
      { ...defects, chartType: SupportedChartType.Metric }
    );

    expect(result.panelLevel.hide_title).toBe(true);
    expect((result.config.metrics as Array<{ label?: string }>)[0].label).toBe('Total requests');
    expect(result.changes.map((change) => change.id)).toContain('T1');
  });

  it('leaves metric titles when preserve includes panel_title', () => {
    const result = applyHouseStyle(
      { type: 'metric', title: 'Total requests', metrics: [{ type: 'primary', column: 'count' }] },
      { ...defects, chartType: SupportedChartType.Metric, preserve: ['panel_title'] }
    );

    expect(result.panelLevel.hide_title).toBeUndefined();
    expect(result.changes).toEqual([]);
  });

  it('does not emit a change for background plus auto metric color (M2)', () => {
    const result = applyHouseStyle(
      {
        type: 'metric',
        metrics: [
          {
            type: 'primary',
            column: 'count',
            color: { type: 'auto' },
            apply_color_to: 'background',
          },
        ],
      },
      { ...defects, chartType: SupportedChartType.Metric }
    );

    expect(result.changes.map((change) => change.id)).not.toContain('M2');
    expect((result.config.metrics as Array<{ apply_color_to?: string }>)[0].apply_color_to).toBe(
      'background'
    );
  });

  it('clears static metric colors (M2)', () => {
    const result = applyHouseStyle(
      {
        type: 'metric',
        metrics: [
          {
            type: 'primary',
            column: 'count',
            color: { type: 'static', color: '#ff0000' },
            apply_color_to: 'value',
          },
        ],
      },
      { ...defects, chartType: SupportedChartType.Metric }
    );

    expect((result.config.metrics as Array<{ color?: { type: string } }>)[0].color).toEqual({
      type: 'auto',
    });
    expect(
      (result.config.metrics as Array<{ apply_color_to?: string }>)[0].apply_color_to
    ).toBeUndefined();
    expect(result.changes.map((change) => change.id)).toContain('M2');
  });

  it('fills missing xy legend visibility (X0)', () => {
    const result = applyHouseStyle(
      { type: 'xy', layers: [{ type: 'line', y: [{ column: 'count' }] }] },
      { ...defects, chartType: SupportedChartType.XY }
    );

    expect((result.config.legend as { visibility?: string }).visibility).toBe('auto');
    expect(result.changes.map((change) => change.id)).toContain('X0');
  });

  it('sets gradient fill on area layers (X1)', () => {
    const result = applyHouseStyle(
      { type: 'xy', layers: [{ type: 'area', y: [{ column: 'count' }] }] },
      { ...defects, chartType: SupportedChartType.XY }
    );

    expect((result.config.styling as { areas?: { fill?: string } }).areas?.fill).toBe('gradient');
  });

  it('hides a forced single-series legend (X2)', () => {
    const result = applyHouseStyle(
      {
        type: 'xy',
        legend: { visibility: 'visible' },
        layers: [{ type: 'line', y: [{ column: 'count' }] }],
      },
      { ...defects, chartType: SupportedChartType.XY }
    );

    expect((result.config.legend as { visibility?: string }).visibility).toBe('auto');
    expect(result.changes.map((change) => change.id)).toContain('X2');
  });

  it('replaces legacy palettes and keeps from_palette index (X8)', () => {
    const result = applyHouseStyle(
      {
        type: 'xy',
        layers: [
          {
            type: 'bar',
            y: [
              {
                column: 'count',
                color: {
                  mode: 'categorical',
                  palette: 'eui_amsterdam',
                  mapping: [{ type: 'from_palette', index: 2 }],
                },
              },
            ],
          },
        ],
      },
      { ...defects, chartType: SupportedChartType.XY }
    );

    const color = (
      result.config.layers as Array<{ y: Array<{ color: Record<string, unknown> }> }>
    )[0].y[0].color;
    expect(color.palette).toBe('default');
    expect(color.mapping).toEqual([{ type: 'from_palette', index: 2 }]);
  });

  it('uses the line-optimized palette when every layer is a line (X8)', () => {
    const result = applyHouseStyle(
      {
        type: 'xy',
        layers: [
          {
            type: 'line',
            y: [{ column: 'count', color: { palette: 'kibana_v7_legacy' } }],
          },
        ],
      },
      { ...defects, chartType: SupportedChartType.XY }
    );

    expect(
      (result.config.layers as Array<{ y: Array<{ color: { palette: string } }> }>)[0].y[0].color
        .palette
    ).toBe('elastic_line_optimized');
  });

  it('rewrites table value and background coloring to badge (D1)', () => {
    const result = applyHouseStyle(
      {
        type: 'data_table',
        metrics: [{ column: 'count', apply_color_to: 'value', color: { type: 'auto' } }],
        rows: [{ column: 'host', apply_color_to: 'background' }],
      },
      { ...defects, chartType: SupportedChartType.Datatable }
    );

    expect((result.config.metrics as Array<{ apply_color_to: string }>)[0].apply_color_to).toBe(
      'badge'
    );
    expect((result.config.rows as Array<{ apply_color_to: string }>)[0].apply_color_to).toBe(
      'badge'
    );
  });

  it('hides axis titles only in the all tier and records dropped text (X4)', () => {
    const input = {
      type: 'xy',
      axis: { x: { title: { visible: true, text: 'Time' } }, y: { title: { visible: true } } },
      layers: [{ type: 'line', y: [{ column: 'count' }] }],
    };

    const defectsOnly = applyHouseStyle(input, { ...defects, chartType: SupportedChartType.XY });
    expect(
      (defectsOnly.config.axis as { x: { title: { visible?: boolean } } }).x.title.visible
    ).toBe(true);

    const allRules = applyHouseStyle(input, {
      chartType: SupportedChartType.XY,
      mode: 'normalize',
      rules: 'all',
      colors: 'keep',
    });
    expect((allRules.config.axis as { x: { title: { visible?: boolean } } }).x.title.visible).toBe(
      false
    );
    expect(allRules.changes.find((change) => change.id === 'X4')?.detail).toBe('Time');
  });

  it('moves legends outside bottom and drops size and columns (X5)', () => {
    const result = applyHouseStyle(
      {
        type: 'xy',
        legend: {
          visibility: 'visible',
          placement: 'inside',
          position: 'top_right',
          size: 'medium',
          columns: 2,
          statistics: ['avg'],
        },
        layers: [{ type: 'line', y: [{ column: 'a' }, { column: 'b' }] }],
      },
      {
        chartType: SupportedChartType.XY,
        mode: 'new',
        rules: 'all',
        colors: 'keep',
      }
    );

    expect(result.config.legend).toEqual({
      visibility: 'visible',
      placement: 'outside',
      position: 'bottom',
      statistics: ['avg'],
    });
  });

  it('resets custom series colors only when colors is reset', () => {
    const input = {
      type: 'xy',
      layers: [
        {
          type: 'line',
          y: [{ column: 'count', color: { type: 'static', color: '#00ff00' } }],
        },
      ],
    };

    const kept = applyHouseStyle(input, { ...defects, chartType: SupportedChartType.XY });
    expect(
      (kept.config.layers as Array<{ y: Array<{ color: { type: string } }> }>)[0].y[0].color.type
    ).toBe('static');

    const reset = applyHouseStyle(input, {
      chartType: SupportedChartType.XY,
      mode: 'normalize',
      rules: 'defects',
      colors: 'reset',
    });
    expect(
      (reset.config.layers as Array<{ y: Array<{ color: { type: string } }> }>)[0].y[0].color
    ).toEqual({ type: 'auto' });
  });

  it('does not apply all-tier rules on edit', () => {
    const result = applyHouseStyle(
      {
        type: 'xy',
        legend: { visibility: 'auto', placement: 'inside', position: 'right' },
        axis: { y: { title: { visible: true, text: 'Bytes' } } },
        layers: [{ type: 'line', y: [{ column: 'count' }] }],
      },
      { chartType: SupportedChartType.XY, mode: 'edit', rules: 'all', colors: 'keep' }
    );

    expect((result.config.legend as { placement?: string }).placement).toBe('inside');
    expect((result.config.axis as { y: { title: { visible?: boolean } } }).y.title.visible).toBe(
      true
    );
  });

  it('is idempotent for defects', () => {
    const input = {
      type: 'xy',
      layers: [{ type: 'area', y: [{ column: 'count' }] }],
    };
    const once = applyHouseStyle(input, { ...defects, chartType: SupportedChartType.XY });
    const twice = applyHouseStyle(once.config, { ...defects, chartType: SupportedChartType.XY });
    expect(twice.config).toEqual(once.config);
    expect(twice.changes).toEqual([]);
  });
});
