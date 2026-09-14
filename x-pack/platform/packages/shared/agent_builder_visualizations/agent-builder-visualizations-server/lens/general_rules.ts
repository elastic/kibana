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
      'Units: set `format` on the bound column whenever the data has a well-known unit, inferring it from column names and the request (e.g. "cpu", "bytes_in", "latency_ms") even when nobody asked: utilization percentages → { type: "percent", decimals: 1, compact: true }; bytes → { type: "bytes", decimals: 1 }; bits → { type: "bits", decimals: 1 }; durations → { type: "duration", from: "<source unit>", to: "" } where <source unit> matches the ES field unit (e.g. "ms", "s", "micros"). Leave plain counts and ambiguous units unformatted.',
  },
];
