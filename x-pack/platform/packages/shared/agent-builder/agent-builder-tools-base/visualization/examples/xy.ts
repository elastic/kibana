/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Canonical example configs shown to the model on escalation-ladder attempts
 * (see graph_lens.ts). Every example must validate against the chart type's
 * schema — enforced by xy.test.ts so the examples never rot. The `data_source`
 * fields make the examples schema-valid; the prompt strips them before
 * rendering because the system owns and injects the ES|QL query.
 */
export interface ChartConfigExample {
  description: string;
  config: Record<string, unknown>;
}

export const xyConfigExamples: ChartConfigExample[] = [
  {
    description: 'Line time-series with a breakdown per category',
    config: {
      type: 'xy',
      title: 'Request count over time by host',
      layers: [
        {
          type: 'line',
          data_source: {
            type: 'esql',
            query:
              'FROM logs-* | STATS `Request count` = COUNT(*) BY `Over time` = BUCKET(@timestamp, 75, ?_tstart, ?_tend), host.name',
          },
          x: { column: 'Over time' },
          y: [{ column: 'Request count' }],
          breakdown_by: { column: 'host.name' },
        },
      ],
      axis: { x: { title: { visible: false } }, y: { title: { visible: false } } },
      legend: { placement: 'outside', position: 'bottom' },
    },
  },
  {
    description: 'Horizontal bar top-N: category on x, metric on y',
    config: {
      type: 'xy',
      title: 'Top 5 operating systems by error count',
      layers: [
        {
          type: 'bar_horizontal',
          data_source: {
            type: 'esql',
            query:
              'FROM logs-* | WHERE log.level == "error" AND @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS `Error count` = COUNT(*) BY os.name | SORT `Error count` DESC | LIMIT 5',
          },
          x: { column: 'os.name' },
          y: [{ column: 'Error count' }],
        },
      ],
      axis: { x: { title: { visible: false } }, y: { title: { visible: false } } },
    },
  },
  {
    description: 'Stacked area time-series with byte value formatting',
    config: {
      type: 'xy',
      title: 'Network bytes over time by direction',
      layers: [
        {
          type: 'area_stacked',
          data_source: {
            type: 'esql',
            query:
              'FROM metrics-* | STATS `Bytes` = SUM(network.bytes) BY `Over time` = BUCKET(@timestamp, 75, ?_tstart, ?_tend), network.direction',
          },
          x: { column: 'Over time' },
          y: [{ column: 'Bytes', format: { type: 'bytes', decimals: 1 } }],
          breakdown_by: { column: 'network.direction' },
        },
      ],
      axis: { x: { title: { visible: false } }, y: { title: { visible: false } } },
      legend: { placement: 'outside', position: 'right' },
    },
  },
];
