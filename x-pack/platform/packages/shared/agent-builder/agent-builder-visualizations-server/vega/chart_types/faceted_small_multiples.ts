/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VegaLiteChartTypeEntry } from './types';

export const chartType: VegaLiteChartTypeEntry = {
  dialect: 'vega-lite',
  id: 'faceted_small_multiples',
  prompt: {
    selection: {
      title: 'Faceted small multiples (one panel per category)',
      description:
        'Split one chart into a grid of small multiples: a top-level `facet` (the splitting field) plus a per-cell `spec`, with `columns` as a SIBLING of `facet`/`spec` (never inside `facet`). Auto-sizing does not apply to facets, so set explicit `width`/`height` on the inner `spec`. Keep the facet field low-cardinality so the grid stays readable.',
      guideline: 'Select when the structure is faceted small multiples (facet + per-cell spec).',
    },
  },
  example: {
    load: () => import('./faceted_small_multiples').then((module) => module.spec),
  },
};

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
