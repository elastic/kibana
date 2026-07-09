/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const spec: Record<string, unknown> = {
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  title: 'Daily Request Count with Average Latency',
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
