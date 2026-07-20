/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VegaLiteChartTypeEntry } from './types';

export const chartType: VegaLiteChartTypeEntry = {
  dialect: 'vega-lite',
  id: 'heatmap',
  prompt: {
    selection: {
      title: 'Heatmap (two categories + color measure)',
      description:
        'Density across two dimensions with a `rect` mark: an ordinal/nominal `x` and `y`, and a sequential `color` scheme for the measure.',
      guideline: 'Select when the structure is a two-category density grid colored by a measure.',
    },
  },
  example: {
    load: () => import('./heatmap').then((module) => module.spec),
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
        'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | EVAL hour = DATE_EXTRACT("HOUR_OF_DAY", @timestamp), day = DATE_FORMAT("EEE", @timestamp) | STATS count = COUNT(*) BY hour, day | SORT hour ASC',
    },
  },
  mark: 'rect',
  encoding: {
    x: { field: 'hour', type: 'ordinal', title: 'Hour of Day', axis: { labelAngle: 0 } },
    y: { field: 'day', type: 'ordinal', title: 'Day' },
    color: {
      field: 'count',
      type: 'quantitative',
      title: 'Events',
      scale: { scheme: 'blues' },
    },
    tooltip: [
      { field: 'day', type: 'ordinal', title: 'Day' },
      { field: 'hour', type: 'ordinal', title: 'Hour' },
      { field: 'count', type: 'quantitative', title: 'Events' },
    ],
  },
};
