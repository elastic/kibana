/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const spec: Record<string, unknown> = {
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  title: 'Latency vs Throughput by Host (bubble = error count)',
  autosize: { type: 'fit', contains: 'padding' },
  data: {
    url: {
      '%type%': 'esql',
      '%timefield%': '@timestamp',
      query:
        'FROM metrics-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS avg_latency = AVG(latency_ms), throughput = COUNT(*), error_count = SUM(is_error) BY host.name | SORT throughput DESC | LIMIT 100',
    },
  },
  mark: { type: 'point', filled: true, opacity: 0.7 },
  encoding: {
    x: {
      field: 'avg_latency',
      type: 'quantitative',
      title: 'Avg Latency (ms)',
      scale: { zero: false },
    },
    y: { field: 'throughput', type: 'quantitative', title: 'Throughput', scale: { zero: false } },
    size: { field: 'error_count', type: 'quantitative', title: 'Errors' },
    color: { field: 'host\\.name', type: 'nominal', title: 'Host' },
    tooltip: [
      { field: 'host\\.name', type: 'nominal', title: 'Host' },
      { field: 'avg_latency', type: 'quantitative', title: 'Avg Latency', format: '.1f' },
      { field: 'throughput', type: 'quantitative', title: 'Throughput' },
      { field: 'error_count', type: 'quantitative', title: 'Errors' },
    ],
  },
};
