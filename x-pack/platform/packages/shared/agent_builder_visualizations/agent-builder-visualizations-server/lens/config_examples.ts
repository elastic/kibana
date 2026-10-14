/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { KbnPalette, getPalettes } from '@kbn/palettes';
import type { ChartTypeRegistry } from './chart_type_registry';

type ConfigInput<T extends SupportedChartType> = z.input<ChartTypeRegistry[T]['schema']>;

type WithoutDataSource<T> = T extends unknown ? Omit<T, 'data_source'> : never;

/** A Lens config as the model writes it. The system injects every `data_source`. */
export type AuthoredLensConfig<T extends SupportedChartType> = ConfigInput<T> extends {
  layers: Array<infer Layer>;
}
  ? Omit<ConfigInput<T>, 'layers'> & { layers: Array<WithoutDataSource<Layer>> }
  : WithoutDataSource<ConfigInput<T>>;

export interface LensConfigExample {
  /** The data shape or request the example fits. */
  label: string;
  config: object;
}

const statusColors = (stepCount: number): string[] =>
  getPalettes(false).get(KbnPalette.Status).colors(stepCount);

const hiddenAxisTitle = { title: { visible: false } };

const listLegend = { position: 'bottom', layout: { type: 'list' }, visibility: 'auto' } as const;

const [lowErrorRateColor, mediumErrorRateColor, highErrorRateColor] = statusColors(3);

const [firstGaugeColor, secondGaugeColor, thirdGaugeColor, fourthGaugeColor] = statusColors(4);

const categoryColorMapping = {
  mode: 'categorical' as const,
  palette: 'default',
  mapping: [
    { values: ['<category value>'], color: { type: 'color_code' as const, value: '<hex color>' } },
  ],
};

/**
 * House-style examples per chart type. They use placeholder column names, follow
 * the chart rules, and leave out `data_source` and schema defaults so the model
 * does not copy them.
 */
const lensConfigExamples: Record<SupportedChartType, readonly LensConfigExample[]> = {
  [SupportedChartType.Metric]: [
    {
      label: 'Unbounded value (count, sum, bytes, duration) with a trend background',
      config: {
        type: 'metric',
        metrics: [
          { type: 'primary', column: '<value column>', background_chart: { type: 'trend' } },
        ],
      } satisfies AuthoredLensConfig<SupportedChartType.Metric>,
    },
    {
      label: 'Bounded measure that reads as good or bad (error rate already scaled to 0-100)',
      config: {
        type: 'metric',
        metrics: [
          {
            type: 'primary',
            column: '<rate column>',
            format: { type: 'number', decimals: 1, suffix: '%' },
            color: {
              type: 'dynamic',
              range: 'absolute',
              steps: [
                { gte: 0, lt: 1, color: lowErrorRateColor },
                { gte: 1, lt: 5, color: mediumErrorRateColor },
                { gte: 5, lte: 100, color: highErrorRateColor },
              ],
            },
            apply_color_to: 'value',
          },
        ],
      } satisfies AuthoredLensConfig<SupportedChartType.Metric>,
    },
    {
      label: 'Specific value color, only when the request asks for one',
      config: {
        type: 'metric',
        metrics: [
          {
            type: 'primary',
            column: '<value column>',
            color: { type: 'static', color: '<hex color>' },
            apply_color_to: 'value',
          },
        ],
      } satisfies AuthoredLensConfig<SupportedChartType.Metric>,
    },
  ],
  [SupportedChartType.Gauge]: [
    {
      label: 'Gauge with the default percentage bands',
      config: {
        type: 'gauge',
        metric: {
          column: '<value column>',
          color: {
            type: 'dynamic',
            range: 'percentage',
            steps: [
              { gte: 0, lt: 25, color: firstGaugeColor },
              { gte: 25, lt: 50, color: secondGaugeColor },
              { gte: 50, lt: 75, color: thirdGaugeColor },
              { gte: 75, lte: 100, color: fourthGaugeColor },
            ],
          },
        },
      } satisfies AuthoredLensConfig<SupportedChartType.Gauge>,
    },
  ],
  [SupportedChartType.XY]: [
    {
      label: 'Time series: a date column and one or more measures',
      config: {
        type: 'xy',
        title: '<Measure> over time',
        axis: { x: { scale: 'temporal', ...hiddenAxisTitle }, y: hiddenAxisTitle },
        legend: listLegend,
        styling: { areas: { fill: 'gradient' } },
        layers: [
          {
            type: 'area',
            x: { column: '<date column>' },
            y: [{ column: '<measure column>' }],
          },
        ],
      } satisfies AuthoredLensConfig<SupportedChartType.XY>,
    },
    {
      label:
        'Time series with legend statistics, only when the request asks for them (e.g. avg/min/max in the legend)',
      config: {
        type: 'xy',
        title: '<Measure> over time',
        axis: { x: { scale: 'temporal', ...hiddenAxisTitle }, y: hiddenAxisTitle },
        legend: {
          position: 'bottom',
          layout: { type: 'grid' },
          visibility: 'visible',
          statistics: ['avg', 'min', 'max'],
        },
        styling: { areas: { fill: 'gradient' } },
        layers: [
          {
            type: 'area',
            x: { column: '<date column>' },
            y: [{ column: '<measure column>' }],
          },
        ],
      } satisfies AuthoredLensConfig<SupportedChartType.XY>,
    },
    {
      label: 'Time series split by a category: a date column, a category column, and a measure',
      config: {
        type: 'xy',
        title: '<Measure> by <category> over time',
        axis: { x: { scale: 'temporal', ...hiddenAxisTitle }, y: hiddenAxisTitle },
        legend: listLegend,
        layers: [
          {
            type: 'line',
            x: { column: '<date column>' },
            y: [{ column: '<measure column>' }],
            breakdown_by: { column: '<category column>' },
          },
        ],
      } satisfies AuthoredLensConfig<SupportedChartType.XY>,
    },
    {
      label: 'Specific colors per category, only when the request asks for them',
      config: {
        type: 'xy',
        title: '<Measure> by <category> over time',
        axis: { x: { scale: 'temporal', ...hiddenAxisTitle }, y: hiddenAxisTitle },
        legend: listLegend,
        layers: [
          {
            type: 'line',
            x: { column: '<date column>' },
            y: [{ column: '<measure column>' }],
            breakdown_by: { column: '<category column>', color: categoryColorMapping },
          },
        ],
      } satisfies AuthoredLensConfig<SupportedChartType.XY>,
    },
    {
      label: 'Ranking by category: a category column and a measure, no date',
      config: {
        type: 'xy',
        title: '<Measure> by <category>',
        axis: { x: hiddenAxisTitle, y: hiddenAxisTitle },
        legend: listLegend,
        layers: [
          {
            type: 'bar_horizontal',
            x: { column: '<category column>' },
            y: [{ column: '<measure column>' }],
          },
        ],
      } satisfies AuthoredLensConfig<SupportedChartType.XY>,
    },
    {
      label: 'Time series with a specific series color, only when the request asks for one',
      config: {
        type: 'xy',
        title: '<Measure> over time',
        axis: { x: { scale: 'temporal', ...hiddenAxisTitle }, y: hiddenAxisTitle },
        legend: listLegend,
        styling: { areas: { fill: 'gradient' } },
        layers: [
          {
            type: 'area',
            x: { column: '<date column>' },
            y: [{ column: '<measure column>', color: { type: 'static', color: '<hex color>' } }],
          },
        ],
      } satisfies AuthoredLensConfig<SupportedChartType.XY>,
    },
    {
      label: 'Ranking with a specific bar color, only when the request asks for one',
      config: {
        type: 'xy',
        title: '<Measure> by <category>',
        axis: { x: hiddenAxisTitle, y: hiddenAxisTitle },
        legend: listLegend,
        layers: [
          {
            type: 'bar_horizontal',
            x: { column: '<category column>' },
            y: [{ column: '<measure column>', color: { type: 'static', color: '<hex color>' } }],
          },
        ],
      } satisfies AuthoredLensConfig<SupportedChartType.XY>,
    },
  ],
  [SupportedChartType.Heatmap]: [
    {
      label: 'Measure by two bucket columns',
      config: {
        type: 'heatmap',
        title: '<Measure> by <x bucket> and <y bucket>',
        x: { column: '<x bucket column>' },
        y: { column: '<y bucket column>' },
        metric: { column: '<measure column>' },
      } satisfies AuthoredLensConfig<SupportedChartType.Heatmap>,
    },
  ],
  [SupportedChartType.Tagcloud]: [
    {
      label: 'Short terms sized by a measure',
      config: {
        type: 'tag_cloud',
        title: '<Measure> by <term>',
        tag_by: { column: '<term column>' },
        metric: { column: '<measure column>' },
      } satisfies AuthoredLensConfig<SupportedChartType.Tagcloud>,
    },
  ],
  [SupportedChartType.RegionMap]: [
    {
      label: 'Measure by region code',
      config: {
        type: 'region_map',
        title: '<Measure> by <region>',
        region: { column: '<region code column>' },
        metric: { column: '<measure column>' },
      } satisfies AuthoredLensConfig<SupportedChartType.RegionMap>,
    },
  ],
  [SupportedChartType.Datatable]: [
    {
      label:
        'Top rows by a measure, with a formatted column and a status badge. The query already sorts and limits the rows, so leave sorting and paging to it',
      config: {
        type: 'data_table',
        title: '<Measures> by <category>',
        rows: [{ column: '<category column>' }],
        metrics: [
          { column: '<count column>' },
          { column: '<bytes column>', format: { type: 'bytes', decimals: 1 } },
          {
            column: '<error rate column>',
            format: { type: 'number', decimals: 1, suffix: '%' },
            apply_color_to: 'badge',
            color: { type: 'auto' },
          },
        ],
      } satisfies AuthoredLensConfig<SupportedChartType.Datatable>,
    },
  ],
  [SupportedChartType.Pie]: [
    {
      label: 'Share of a measure by category',
      config: {
        type: 'pie',
        title: '<Measure> by <category>',
        metrics: [{ column: '<measure column>' }],
        group_by: [{ column: '<category column>' }],
      } satisfies AuthoredLensConfig<SupportedChartType.Pie>,
    },
    {
      label: 'Donut, only when the request asks for one',
      config: {
        type: 'pie',
        title: '<Measure> by <category>',
        metrics: [{ column: '<measure column>' }],
        group_by: [{ column: '<category column>' }],
        styling: { donut_hole: 'm' },
      } satisfies AuthoredLensConfig<SupportedChartType.Pie>,
    },
    {
      label: 'Specific slice colors, only when the request asks for them',
      config: {
        type: 'pie',
        title: '<Measure> by <category>',
        metrics: [{ column: '<measure column>' }],
        group_by: [{ column: '<category column>', color: categoryColorMapping }],
      } satisfies AuthoredLensConfig<SupportedChartType.Pie>,
    },
    {
      label: 'Shades of one color across the slices, only when the request asks for them',
      config: {
        type: 'pie',
        title: '<Measure> by <category>',
        metrics: [{ column: '<measure column>' }],
        group_by: [
          {
            column: '<category column>',
            color: {
              mode: 'gradient',
              palette: 'default',
              gradient: [
                { type: 'color_code', value: '<light hex color>' },
                { type: 'color_code', value: '<dark hex color>' },
              ],
            },
          },
        ],
      } satisfies AuthoredLensConfig<SupportedChartType.Pie>,
    },
  ],
  [SupportedChartType.Treemap]: [
    {
      label: 'Size of a measure by category',
      config: {
        type: 'treemap',
        title: '<Measure> by <category>',
        metrics: [{ column: '<measure column>' }],
        group_by: [{ column: '<category column>' }],
      } satisfies AuthoredLensConfig<SupportedChartType.Treemap>,
    },
  ],
  [SupportedChartType.Waffle]: [
    {
      label: 'Share of a measure by category',
      config: {
        type: 'waffle',
        title: '<Measure> by <category>',
        metrics: [{ column: '<measure column>' }],
        group_by: [{ column: '<category column>' }],
      } satisfies AuthoredLensConfig<SupportedChartType.Waffle>,
    },
  ],
  [SupportedChartType.Mosaic]: [
    {
      label: 'Measure by two categories',
      config: {
        type: 'mosaic',
        title: '<Measure> by <category> and <subcategory>',
        metric: { column: '<measure column>' },
        group_by: [{ column: '<category column>' }],
        group_breakdown_by: [{ column: '<subcategory column>' }],
      } satisfies AuthoredLensConfig<SupportedChartType.Mosaic>,
    },
  ],
};

/** Returns the house-style examples for a chart type. */
export const getConfigExamples = (chartType: SupportedChartType): readonly LensConfigExample[] =>
  lensConfigExamples[chartType];
