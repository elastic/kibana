/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const spec: Record<string, unknown> = {
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  title: 'Pipeline Stage Timeline',
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
