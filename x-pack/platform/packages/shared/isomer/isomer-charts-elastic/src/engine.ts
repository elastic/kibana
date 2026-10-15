/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement as h, type ReactNode } from 'react';
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
import { TreemapChart } from './treemap';
import { XyChart } from './xy_chart';

/** The Elastic Charts release this engine draws with, Kibana's pin. */
export const ELASTIC_CHARTS_VERSION = '73.3.0';

export interface ElasticChartsEngineOptions {
  /** Presentation per node id, from the composition's source. Validated here; an unknown key throws. */
  hints?: ChartHints;
}

const live = { live: true, static: false } as const;

/** A `ChartEngine` drawing with Elastic Charts under Kibana's Borealis theme. */
export const defineElasticChartsEngine = ({
  hints = {},
}: ElasticChartsEngineOptions = {}): ChartEngine => {
  const parsed = chartHintsSchema.parse(hints);
  const hintFor = ({ id }: ChartNode): ChartHint | undefined =>
    id === undefined ? undefined : parsed[id];
  return {
    id: 'elastic-charts',
    version: ELASTIC_CHARTS_VERSION,
    supports: {
      donut: { fidelity: 'native', selection: live },
      gauge: { fidelity: 'native', selection: live },
      heatmap: { fidelity: 'native', selection: live },
      metricTrend: { fidelity: 'native', selection: live },
      treemap: { fidelity: 'native', selection: live },
      xyChart: { fidelity: 'native', selection: live },
    },
    live: {
      donut: (props: LiveChartProps<DonutNode>): ReactNode =>
        h(DonutChart, { ...props, hint: hintFor(props.node) ?? {} }),
      gauge: (props: LiveChartProps<GaugeNode>): ReactNode =>
        h(GaugeChart, { ...props, hint: hintFor(props.node) ?? {} }),
      heatmap: (props: LiveChartProps<HeatmapNode>): ReactNode =>
        h(HeatmapChart, { ...props, hint: hintFor(props.node) ?? {} }),
      metricTrend: (props: LiveChartProps<MetricTrendNode>): ReactNode =>
        h(MetricTrendChart, { ...props, hint: hintFor(props.node) ?? {} }),
      treemap: (props: LiveChartProps<TreemapNode>): ReactNode =>
        h(TreemapChart, { ...props, hint: hintFor(props.node) ?? {} }),
      xyChart: (props: LiveChartProps<XyChartNode>): ReactNode =>
        h(XyChart, { ...props, hint: hintFor(props.node) ?? {} }),
    },
  };
};
