/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Chart-agnostic presentation rules. Every chart type's prompt lists them
 * before its own rules.
 */
export const generalChartRules: string[] = [
  'Units: set `format` on the bound column whenever the data has a well-known unit, inferring it from column names and the request (e.g. "cpu", "bytes_in", "latency_ms") even when nobody asked. Utilization percentages on 0 to 1 ratios use { type: "percent", decimals: 1, compact: true } (see Percent scale for already-scaled columns). Bytes use { type: "bytes", decimals: 1 }. Bits use { type: "bits", decimals: 1 }. Durations use { type: "duration", from: "<source unit>", to: "" }, where <source unit> matches the ES field unit (e.g. "ms", "s", "micros"). Leave plain counts and ambiguous units unformatted.',
  'Percent scale: `{ type: "percent" }` multiplies the value by 100, so use it only when the query yields a 0 to 1 ratio. When the query already scales to 0 to 100 (e.g. `100 * errors / total`, `ROUND(... * 100, 1)`, columns named `_pct` or `percentage`), use `{ type: "number", decimals: 1, suffix: "%" }` instead. Thresholds and color `steps` must use the same scale as the column values.',
];
