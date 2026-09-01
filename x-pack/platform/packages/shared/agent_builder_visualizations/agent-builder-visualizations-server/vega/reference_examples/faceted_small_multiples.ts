/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const spec: Record<string, unknown> = {
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  data: {
    url: {
      '%type%': 'esql',
      '%timefield%': '@timestamp',
      query:
        'FROM traces-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS p95_latency = PERCENTILE(latency_ms, 95) BY service.name, time_bucket = BUCKET(@timestamp, 1 hour) | SORT time_bucket ASC',
    },
  },
  facet: { field: 'service\\.name', type: 'nominal', header: { title: 'Service' } },
  columns: 3,
  spec: {
    width: 200,
    height: 120,
    mark: { type: 'line', point: false },
    encoding: {
      x: { field: 'time_bucket', type: 'temporal', title: null, axis: { labelAngle: 0 } },
      y: { field: 'p95_latency', type: 'quantitative', title: 'p95 (ms)' },
    },
  },
};
