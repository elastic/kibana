/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VegaLiteChartTypeEntry } from './types';

export const chartType: VegaLiteChartTypeEntry = {
  dialect: 'vega-lite',
  id: 'timeline_gantt',
  prompt: {
    selection: {
      title: 'Timeline / Gantt (ranged bars)',
      description:
        'Show the start-to-end span of each item as a horizontal ranged bar: a `bar` mark with a temporal `x` (start) and `x2` (end) against a nominal `y` (the item). Pre-sort by start and set `sort: null` on `y`.',
      guideline: 'Select when the structure is a timeline/Gantt with ranged bars (x/x2).',
    },
  },
  example: {
    load: () => import('./timeline_gantt').then((module) => module.spec),
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
        'FROM ci-pipelines-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS start_time = MIN(@timestamp), end_time = MAX(@timestamp) BY stage | SORT start_time ASC',
    },
  },
  mark: { type: 'bar', cornerRadius: 2 },
  encoding: {
    y: { field: 'stage', type: 'nominal', sort: null, title: null },
    x: {
      field: 'start_time',
      type: 'temporal',
      title: 'Time',
      axis: { labelAngle: 0, tickCount: 8 },
    },
    x2: { field: 'end_time' },
    tooltip: [
      { field: 'stage', type: 'nominal', title: 'Stage' },
      { field: 'start_time', type: 'temporal', title: 'Start' },
      { field: 'end_time', type: 'temporal', title: 'End' },
    ],
  },
};
