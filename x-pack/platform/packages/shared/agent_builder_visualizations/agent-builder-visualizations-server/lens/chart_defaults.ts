/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';

interface ChartDefaults {
  readonly rules: readonly string[];
  readonly coloring?: {
    readonly dynamic?: { readonly recommendedStepCount: number };
    readonly categorical?: true;
  };
}

/** Visual preferences shared by chart generation and dashboard Prettify, never applied by code. */
export const CHART_DEFAULTS: Readonly<Partial<Record<SupportedChartType, ChartDefaults>>> = {
  metric: {
    rules: [
      'Always omit panel titles on metric charts, including legacy metrics. The metric must be titleless.',
      'Use a bar background only for meaningful progress-to-max.',
      'For trend/delta secondary metrics, hide the label with styling.secondary.label.visible: false and omit label. Show labels for distinct named measures.',
      'Set apply_color_to: "value" only together with a color config; do not color the background unless the user asks. Without coloring, leave both color and apply_color_to unset to avoid a default green tint.',
      'For clearly bounded metrics (percent, ratio, utilization, error/success rate, SLO compliance), prefer 3 explicit color bands when thresholds have semantic meaning. Prefer "Status", "Negative", "Positive", or "Temperature".',
      'For bounded adverse metrics like error rate, higher values are worse; use an adverse/status palette with thresholds in the same unit and scale as the metric output.',
      'For unbounded values (raw counts, bytes, durations, throughput, rates with unknown scale), prefer color: { type: "auto" } or no color.',
    ],
    coloring: { dynamic: { recommendedStepCount: 3 } },
  },
  xy: {
    rules: [
      'Do NOT set axis titles. Rely on the visualization title and column labels to convey meaning. Set axis.x.title.visible: false and axis.y.title.visible: false, and hide the secondary Y-axis title when present.',
      'Place the legend outside at the bottom: legend.placement: "outside" and legend.position: "bottom". Omit legend.layout.type.',
      'Leave legend.visibility unset by default. When legend statistics are set, use legend.visibility: "visible". For a one-series categorical chart without legend statistics, hide the legend with legend.visibility: "hidden".',
      'For area series, set styling.areas.fill: "gradient" rather than solid.',
      'Most time-series line charts should be gradient area. Keep at most one line (the primary overview trend); convert the rest to area with styling.areas.fill: "gradient". Skip bars, categorical charts, and a lone line that is already the only time series.',
    ],
  },
  gauge: {
    rules: [
      "Always omit the optional 'min' and 'max' fields from the final configuration.",
      'Do not infer, synthesize, or backfill gauge bounds from the ES|QL results or the user request.',
      'Only include goal/target-related fields when the user explicitly asks for a goal or threshold.',
      'Gauge default: mirror Lens with range: "percentage" and exactly 4 bands: 0–25, 25–50, 50–75, 75–100.',
      'If the user asks for a non-default gauge palette, keep those same percentage bands and only change the step colors.',
      'Do not invent absolute gauge thresholds from units like bytes, requests, or rates unless the user gave those thresholds.',
    ],
    coloring: { dynamic: { recommendedStepCount: 4 } },
  },
  heatmap: {
    rules: [
      'Prefer Lens automatic coloring with the "Temperature" palette: omit color or use color: { type: "auto" }. Use explicit steps only when the user requests a custom palette or gives thresholds.',
    ],
    coloring: { dynamic: { recommendedStepCount: 5 } },
  },
  data_table: {
    rules: [
      'Only color columns when it adds meaning. Prefer apply_color_to: "badge"; avoid cell background or text coloring unless the user asks.',
      'For numeric columns, prefer color: { type: "auto" } so Lens computes stops from table data. For categorical columns, use color: { mode: "categorical", palette: "<palette id>", mapping: [] } so Lens assigns colors to actual values.',
    ],
    coloring: { dynamic: { recommendedStepCount: 5 }, categorical: true },
  },
  pie: {
    rules: [
      'Omit legend.visibility (or set "auto"). Do not set "visible" or "hidden" — slice labels carry the categories.',
    ],
  },
};
