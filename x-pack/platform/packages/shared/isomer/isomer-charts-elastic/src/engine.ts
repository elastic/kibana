/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement as h, type ReactNode } from 'react';
import type { Theme } from '@elastic/charts';
import type {
  ChartEngine,
  ChartNode,
  DonutNode,
  GaugeNode,
  HeatmapNode,
  LiveChartProps,
  MetricTrendNode,
  TreemapNode,
  XyChartNode,
} from '@kbn/isomer-primitives-charts';

import { DonutChart } from './donut';
import { GaugeChart } from './gauge';
import { HeatmapChart } from './heatmap';
import { type ChartHint, type ChartHints, chartHintsSchema } from './hints';
import { MetricTrendChart } from './metric_trend';
import { type BaseTheme, kibanaBaseTheme } from './theme';
import { TreemapChart } from './treemap';
import { XyChart } from './xy_chart';

/** The Elastic Charts release this engine draws with, Kibana's pin. */
export const ELASTIC_CHARTS_VERSION = '73.3.0';

export interface ElasticChartsEngineOptions {
  /** Presentation per node id, from the composition's source. Validated here; an unknown key throws. */
  hints?: ChartHints;
  /** The base theme every chart draws on, e.g. a host's own charts theme. Defaults to {@link kibanaBaseTheme}. */
  baseTheme?: Theme | BaseTheme;
}

const live = { live: true, static: false } as const;

/** A `ChartEngine` drawing with Elastic Charts under Kibana's Borealis theme. */
export const defineElasticChartsEngine = ({
  hints = {},
  baseTheme: base = kibanaBaseTheme,
}: ElasticChartsEngineOptions = {}): ChartEngine => {
  const parsed = chartHintsSchema.parse(hints);
  const baseTheme: BaseTheme = typeof base === 'function' ? base : () => base;
  const hintFor = ({ id }: ChartNode): ChartHint | undefined =>
    id === undefined ? undefined : parsed[id];
  return {
    id: 'elastic-charts',
    version: ELASTIC_CHARTS_VERSION,
    supports: {
      donut: { fidelity: 'native', selection: live },
      gauge: { fidelity: 'native', selection: live, drawsTitle: true },
      heatmap: { fidelity: 'native', selection: live },
      metricTrend: { fidelity: 'native', selection: live, drawsTitle: true },
      treemap: { fidelity: 'native', selection: live },
      xyChart: { fidelity: 'native', selection: live },
    },
    live: {
      donut: (props: LiveChartProps<DonutNode>): ReactNode =>
        h(DonutChart, { ...props, hint: hintFor(props.node) ?? {}, baseTheme }),
      gauge: (props: LiveChartProps<GaugeNode>): ReactNode =>
        h(GaugeChart, { ...props, hint: hintFor(props.node) ?? {}, baseTheme }),
      heatmap: (props: LiveChartProps<HeatmapNode>): ReactNode =>
        h(HeatmapChart, {
          ...props,
          hint: hintFor(props.node) ?? {},
          baseTheme,
        }),
      metricTrend: (props: LiveChartProps<MetricTrendNode>): ReactNode =>
        h(MetricTrendChart, {
          ...props,
          hint: hintFor(props.node) ?? {},
          baseTheme,
        }),
      treemap: (props: LiveChartProps<TreemapNode>): ReactNode =>
        h(TreemapChart, {
          ...props,
          hint: hintFor(props.node) ?? {},
          baseTheme,
        }),
      xyChart: (props: LiveChartProps<XyChartNode>): ReactNode =>
        h(XyChart, { ...props, hint: hintFor(props.node) ?? {}, baseTheme }),
    },
  };
};
