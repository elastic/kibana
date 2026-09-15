/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Chart-agnostic guidance, split like the per-chart registry entries: `design`
 * is shared by every role that reasons about charts, `config` is only for the
 * Lens config author and explains how to carry the design out in Lens JSON.
 */
export const generalChartGuidance = {
  design: [
    'Titles: omit the panel title when the chart already displays the information within itself (metric, gauge, tagcloud, and waffle charts show their value and label directly). When a title is needed, make it self-explanatory and exhaustive so axis titles become unnecessary. Never duplicate information across the title, axis titles, and metric labels.',
    'Units: show values in their natural unit whenever the data has a well-known one — percentages for utilization and rates, bytes for storage, memory, and network volume, bits for network throughput, human-readable durations for latency and response times. Column names and the request often reveal the unit (e.g. "cpu", "percent", "bytes_in", "disk_used", "latency_ms"); apply it even when nobody asked. Plain counts, rates without a known scale, and ambiguous units stay unformatted.',
    'Explicit user choices and meaningful business thresholds or goals take precedence over defaults. An existing presentation setting alone is not evidence of user intent; during Prettify, apply the listed defaults unless an exception is supported.',
  ],
  config: [
    'Titles: omit the `title` field when the design guidance calls for no panel title; every other chart needs a `title` string.',
    'Number formats — set `format` on the bound column: CPU / utilization percentages → { type: "percent", decimals: 1, compact: true }; bytes → { type: "bytes", decimals: 1 }; bits → { type: "bits", decimals: 1 }; durations → { type: "duration", from: "<source unit>", to: "" } where <source unit> matches the ES field unit (e.g. "ms", "s", "micros"). Do NOT apply a format to plain counts or ambiguous units.',
  ],
} as const;
