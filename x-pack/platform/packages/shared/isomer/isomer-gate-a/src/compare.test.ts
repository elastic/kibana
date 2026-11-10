/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { normalizeColor } from './colors';
import { compareCharts } from './compare';
import type { GateCase } from './corpus';
import { kibanaChart, kibanaChartSize, kibanaTables, listGateCases } from './corpus';
import type { NormalizedMetric, NormalizedXy } from './model';

const cases = listGateCases();
const byName = (name: string): GateCase => {
  const found = cases.find((gateCase) => gateCase.name === name);
  if (!found) {
    throw new Error(`No gate case ${name}`);
  }
  return found;
};

const bytes = (theme: 'light' | 'dark') =>
  kibanaChart(byName(`sample-logs/cbca842c-b9fa-4523-9ce0-14e350866e33/${theme}`)) as NormalizedXy;
const huge = () =>
  kibanaChart(byName('isomer-corpus-values/values-xy-huge-esql/light')) as NormalizedXy;
const visitors = (theme: 'light' | 'dark') =>
  kibanaChart(byName(`sample-logs/11/${theme}`)) as NormalizedMetric;
const visits = (theme: 'light' | 'dark') =>
  kibanaChart(
    byName(`sample-logs/bb94016e-f4a6-49ca-87a9-296a2869d570/${theme}`)
  ) as NormalizedMetric;

describe('listGateCases', () => {
  it('finds the corpus Lens panels, in both color modes', () => {
    const panels = new Set(cases.map(({ name }) => name.replace(/\/(light|dark)$/, '')));
    expect([...panels].sort()).toEqual([
      'isomer-corpus-buckets/buckets-xy-multivalue-esql',
      ...[
        'donut-esql',
        'gauge-arc-esql',
        'gauge-bullet-esql',
        'heatmap-esql',
        'legacy-metric',
        'mosaic-esql',
        'pie-esql',
        'table-esql',
        'tagcloud-esql',
        'treemap-esql',
        'waffle-esql',
      ].map((panel) => `isomer-corpus-charts/charts-${panel}`),
      'isomer-corpus-values/values-metric-esql',
      'isomer-corpus-values/values-xy-huge-esql',
      'sample-logs/01d8e435-91c0-484f-a11e-856747050b0a',
      'sample-logs/11',
      'sample-logs/8c1456d4-1993-4ba2-b701-04aca02c9fef',
      'sample-logs/bb94016e-f4a6-49ca-87a9-296a2869d570',
      'sample-logs/cbca842c-b9fa-4523-9ce0-14e350866e33',
    ]);
    expect(cases).toHaveLength(panels.size * 2);
  });

  it("re-keys Kibana's tables by their ES|QL column names", () => {
    const [table] = kibanaTables(byName('isomer-corpus-values/values-xy-huge-esql/light'));
    expect(table.columns.map(({ id }) => id)).toEqual(['total', 'day']);
    expect(Object.keys(table.rows[0])).toEqual(['total', 'day']);
    expect(
      kibanaChartSize(byName('isomer-corpus-values/values-xy-huge-esql/light')).width
    ).toBeGreaterThan(0);
  });
});

describe('normalizeColor', () => {
  it('writes DOM and Elastic Charts colors as lowercase hex', () => {
    expect(normalizeColor('rgb(252, 196, 0)')).toBe('#fcc400');
    expect(normalizeColor('#16C5C0')).toBe('#16c5c0');
    expect(normalizeColor('rgba(0, 0, 0, 0)')).toBe('#00000000');
    expect(normalizeColor('#FFFFFF00')).toBe('#00000000');
  });
});

describe('compareCharts: known passes', () => {
  it('passes a chart against itself', () => {
    expect(compareCharts(bytes('light'), cloneDeep(bytes('light')))).toEqual([]);
    expect(compareCharts(visitors('light'), cloneDeep(visitors('light')))).toEqual([]);
  });

  it('passes where Kibana drew the same in both color modes', () => {
    // Kibana draws this chart's series in the same color in light and dark mode.
    expect(compareCharts(bytes('light'), bytes('dark'))).toEqual([]);
    // A colored metric background is the configured band color in both modes.
    expect(compareCharts(visitors('light'), visitors('dark'))).toEqual([]);
  });

  it('passes geometry that moved within the tolerance', () => {
    const moved = cloneDeep(huge());
    moved.axes[0].gridlines = moved.axes[0].gridlines?.map(({ x, y }) => ({ x: x + 0.6, y }));
    moved.series[0].paths = moved.series[0].paths?.map((path) =>
      path.replace(/\d+\.\d+/g, (number) => String(Number(number) + 0.5))
    );
    expect(compareCharts(huge(), moved)).toEqual([]);
  });

  it('skips geometry a side does not have, such as a Scene', () => {
    const contentOnly = cloneDeep(huge());
    contentOnly.axes.forEach((axis) => delete axis.gridlines);
    contentOnly.series.forEach((series) => delete series.paths);
    expect(compareCharts(huge(), contentOnly)).toEqual([]);
  });
});

describe('compareCharts: known failures', () => {
  it('fails on a series color, worded as a review comment', () => {
    const recolored = cloneDeep(bytes('light'));
    recolored.legend[0].color = '#54b399';
    recolored.series[0].color = '#54b399';
    expect(compareCharts(bytes('light'), recolored)).toEqual([
      'legend item 1 color "#16c5c0" vs "#54b399"',
      'series 1 color "#16c5c0" vs "#54b399"',
    ]);
  });

  it('fails on a tick label and a title', () => {
    const relabeled = cloneDeep(bytes('light'));
    relabeled.axes[0].labels![4] = '8k';
    relabeled.axes[1].title = 'Percentage';
    expect(compareCharts(bytes('light'), relabeled)).toEqual([
      'axis 1 label 5 "8,000" vs "8k"',
      'axis 2 title "percentage" vs "Percentage"',
    ]);
  });

  it('fails on a value and on a missing series', () => {
    const changed = cloneDeep(bytes('light'));
    changed.series[0].values[2] = { ...changed.series[0].values[2], y: 0.5 };
    expect(compareCharts(bytes('light'), changed)).toEqual([
      expect.stringMatching(/^series 1 value 3 \{.*\} vs \{.*"y":0\.5\}$/),
    ]);
    expect(compareCharts(bytes('light'), { ...bytes('light'), series: [] })).toEqual([
      'series count 1 vs 0',
    ]);
  });

  it('fails on geometry past the tolerance', () => {
    const moved = cloneDeep(huge());
    moved.axes[1].gridlines = moved.axes[1].gridlines?.map(({ x, y }) => ({ x, y: y + 3 }));
    expect(compareCharts(huge(), moved)).toContain('axis 2 gridline 1 moves by 3.00px');
  });

  it('fails where Kibana drew a metric differently in the two color modes', () => {
    // The default metric background follows the color mode.
    expect(compareCharts(visits('light'), visits('dark'))).toEqual([
      'tile 1 background "#ffffff" vs "#111c2c"',
      'tile 1 text 1 color "#111c2c" vs "#e3e8f2"',
      'tile 1 text 2 color "#111c2c" vs "#e3e8f2"',
    ]);
  });

  it('fails between different charts', () => {
    expect(compareCharts(bytes('light'), huge()).length).toBeGreaterThan(0);
    expect(compareCharts(bytes('light'), visits('light'))).toEqual(['chart kind "xy" vs "metric"']);
  });
});
