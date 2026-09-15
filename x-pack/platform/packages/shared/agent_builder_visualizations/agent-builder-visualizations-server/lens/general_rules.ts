/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartRule } from './chart_type_registry';

/**
 * Chart-agnostic presentation rules, compiled ahead of the chart-specific
 * ones for every chart type.
 */
export const generalChartRules: ChartRule[] = [
  {
    design:
      'Units: show values in their natural unit whenever the data has a well-known one — percentages for utilization and rates, bytes for storage, memory, and network volume, bits for network throughput, human-readable durations for latency and response times. Column names and the request often reveal the unit (e.g. "cpu", "percent", "bytes_in", "disk_used", "latency_ms"); apply it even when nobody asked. Plain counts, rates without a known scale, and ambiguous units stay unformatted.',
    config:
      'Units: set `format` on the bound column whenever the data has a well-known unit, inferring it from column names and the request (e.g. "cpu", "bytes_in", "latency_ms") even when nobody asked: utilization percentages → { type: "percent", decimals: 1, compact: true } for 0–1 ratios (see Percent scale for already-scaled columns); bytes → { type: "bytes", decimals: 1 }; bits → { type: "bits", decimals: 1 }; durations → { type: "duration", from: "<source unit>", to: "" } where <source unit> matches the ES field unit (e.g. "ms", "s", "micros"). Leave plain counts and ambiguous units unformatted.',
  },
  {
    design:
      'Percent scale: read the query to see whether a percentage column is a 0–1 ratio (e.g. `errors / total`) or already scaled to 0–100 (e.g. `100 * errors / total`, `... * 100`, names like `_pct` or `percentage`). Percent formatting multiplies by 100, so applying it to an already-scaled column shows 8.8k% instead of 88%. Present already-scaled columns as plain numbers with a "%" suffix instead. Fix a wrong scale in the format, not by rewriting the query.',
    config:
      'Percent scale: `{ type: "percent" }` multiplies the value by 100, so use it only when the query yields a 0–1 ratio. When the query already scales to 0–100 (e.g. `100 * errors / total`, `ROUND(... * 100, 1)`, columns named `_pct` or `percentage`), use `{ type: "number", decimals: 1, suffix: "%" }` instead. Thresholds and color `steps` must use the same scale as the column values.',
  },
];
