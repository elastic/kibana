/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VegaLiteChartTypeEntry } from './types';

export const chartType: VegaLiteChartTypeEntry = {
  dialect: 'vega-lite',
  id: 'layered_combo_dual_axis',
  prompt: {
    selection: {
      title: 'Combination chart (bars + overlaid line, dual axis)',
      description:
        'Two metrics over a shared axis: bars for one, an overlaid line for the other, on independent y-scales. Share the x encoding at the top level, set `sort: null` on any shared categorical axis, give each layer its own y `axis.title`, and put `resolve.scale.y = "independent"` at the top level.',
      guideline: 'Select when the structure is a layered combination chart with dual/independent y-scales.',
    },
  },
  example: {
    load: () => import('./layered_combo_dual_axis').then((module) => module.spec),
  },
};

export const spec: Record<string, unknown> = {
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  autosize: { type: 'fit', contains: 'padding' },
  data: {
    url: {
      '%type%': 'esql',
      '%timefield%': '@timestamp',
      query:
        'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS request_count = COUNT(*), avg_latency = AVG(latency_ms) BY day = BUCKET(@timestamp, 1 day) | SORT day ASC',
    },
  },
  encoding: {
    x: { field: 'day', type: 'temporal', title: null, axis: { labelAngle: 0 } },
  },
  layer: [
    {
      mark: { type: 'bar', opacity: 0.7 },
      encoding: {
        y: { field: 'request_count', type: 'quantitative', axis: { title: 'Requests' } },
      },
    },
    {
      mark: { type: 'line', strokeWidth: 2, point: true },
      encoding: {
        y: { field: 'avg_latency', type: 'quantitative', axis: { title: 'Avg Latency (ms)' } },
      },
    },
  ],
  resolve: { scale: { y: 'independent' } },
};
