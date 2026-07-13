/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getChartTypeConfigPromptContent } from './chart_type_guidance';
import { getColorPalettesPromptContent } from './color_palettes';

export const getLensCommonConfigGuidance = (): string => `TITLE RULES:
- Omit the 'title' field when the chart already displays the information within itself (e.g. metric, gauge, tagcloud, waffle charts show their value and label directly).
- When a title is needed, make it self-explanatory and exhaustive so that axis titles become unnecessary.
- NEVER duplicate information across the chart title, axis titles, and metric labels.

NUMBER FORMAT RULES:
- Always apply a 'format' to columns when the data has a well-known unit:
  - CPU / utilization percentages → { type: "percent", decimals: 1, compact: true }
  - Bytes (disk, memory, network volume) → { type: "bytes", decimals: 1 }
  - Bits (network throughput) → { type: "bits", decimals: 1 }
  - Durations (response time, latency) → { type: "duration", from: "<source unit>", to: "" } where <source unit> matches the ES field unit (e.g. "ms", "s", "micros")
- When column names or the user query hint at a unit (e.g. "cpu", "percent", "bytes_in", "disk_used", "latency_ms"), infer the correct format even if the user did not explicitly ask for it.
- Do NOT apply a format when the metric is a plain count, rate, or when the unit is ambiguous.`;

/**
 * Returns the reusable Lens authoring guidance for the supplied chart types.
 * Repeated chart types are included only once, in first-seen order.
 */
export const getLensConfigGuidance = (chartTypes: readonly SupportedChartType[]): string => {
  const uniqueChartTypes = [...new Set(chartTypes)];
  const chartTypeGuidance = uniqueChartTypes.flatMap((chartType) => [
    getColorPalettesPromptContent(chartType),
    getChartTypeConfigPromptContent(chartType),
  ]);

  return [getLensCommonConfigGuidance(), ...chartTypeGuidance]
    .filter((guidance) => guidance.length > 0)
    .join('\n\n');
};
