/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  metricConfigSchemaESQL,
  gaugeConfigSchemaESQL,
  tagcloudConfigSchemaESQL,
  xyConfigSchemaESQL,
  regionMapConfigSchemaESQL,
  heatmapConfigSchemaESQL,
  datatableConfigSchemaESQL,
  pieConfigSchemaESQL,
  treemapConfigSchemaESQL,
  waffleConfigSchemaESQL,
  mosaicConfigSchemaESQL,
} from '@kbn/lens-embeddable-utils';

interface ChartTypeRegistryEntry<T extends z.ZodType> {
  schema: T;
  prompt: {
    /**
     * One-line "what it shows and when to choose it" used when selecting the
     * best chart type for a user request.
     */
    selection: string;
    /**
     * Screenshot-facing review for this chart type. Compiled into the Prettify
     * prompt together with `config.rules`. Do not put Lens JSON HOW here —
     * that belongs in `config.rules` so the visualization author also sees it.
     */
    review?: {
      /**
       * Required painted violations. Fix these.
       */
      misses?: string[];
      /**
       * Weaker prompts: apply when they add meaning, not as required fixes.
       */
      considerations?: string[];
    };
    /**
     * Guidance used after this chart type has been selected, while generating
     * the Lens config JSON.
     */
    config?: {
      /**
       * Chart-specific structural rules appended to the config-generation prompt.
       */
      rules?: string[];
      /**
       * Chart-specific coloring rules rendered inside the color palette section
       * of the config-generation prompt.
       */
      coloringRules?: string[];
      /**
       * Structured config-generation options consumed by specialized prompt
       * builders.
       */
      options?: {
        coloring?: {
          dynamic?: {
            /**
             * Recommended number of dynamic color bands for generated `steps[]`.
             *
             * This is prompt guidance, not a schema limit.
             */
            recommendedStepCount: number;
          };
          categorical?: true;
        };
      };
    };
  };
}

export interface ChartTypeRegistry {
  [SupportedChartType.Metric]: ChartTypeRegistryEntry<typeof metricConfigSchemaESQL>;
  [SupportedChartType.Gauge]: ChartTypeRegistryEntry<typeof gaugeConfigSchemaESQL>;
  [SupportedChartType.XY]: ChartTypeRegistryEntry<typeof xyConfigSchemaESQL>;
  [SupportedChartType.Heatmap]: ChartTypeRegistryEntry<typeof heatmapConfigSchemaESQL>;
  [SupportedChartType.Tagcloud]: ChartTypeRegistryEntry<typeof tagcloudConfigSchemaESQL>;
  [SupportedChartType.RegionMap]: ChartTypeRegistryEntry<typeof regionMapConfigSchemaESQL>;
  [SupportedChartType.Datatable]: ChartTypeRegistryEntry<typeof datatableConfigSchemaESQL>;
  [SupportedChartType.Pie]: ChartTypeRegistryEntry<typeof pieConfigSchemaESQL>;
  [SupportedChartType.Treemap]: ChartTypeRegistryEntry<typeof treemapConfigSchemaESQL>;
  [SupportedChartType.Waffle]: ChartTypeRegistryEntry<typeof waffleConfigSchemaESQL>;
  [SupportedChartType.Mosaic]: ChartTypeRegistryEntry<typeof mosaicConfigSchemaESQL>;
}

/**
 * Central registry for all supported chart types: schema plus ALL
 * chart-specific prompt guidance (selection, review, config rules, coloring
 * rules).
 *
 * To add a new chart type:
 * 1. Add its value to the `SupportedChartType` enum in agent-builder-common
 * 2. Ensure the ESQL schema is exported from kbn-lens-embeddable-utils
 * 3. Add one entry here with the schema import and LLM guidance
 *
 * TypeScript enforces exhaustiveness via the `ChartTypeRegistry` interface —
 * a missing entry is a compile error.
 */
export const chartTypeRegistry: ChartTypeRegistry = {
  [SupportedChartType.Metric]: {
    schema: metricConfigSchemaESQL,
    prompt: {
      selection:
        'Displays a single numeric value, KPI, or aggregate statistic (count, sum, average) with an optional trend line. Choose for single numbers without ranges or targets.',
      review: {
        misses: [
          'A painted dashboard chrome title on a metric is a miss — the primary metric name is already the title.',
          'Invented static colors or BACKGROUND fills on the primary metric are a miss.',
        ],
        considerations: [
          'When a trend or status could be shown (time series available, or a clear threshold/comparison) and the panel is a lone number on white, consider adding a sparkline or secondary. A single number with nothing to compare or trend is fine.',
        ],
      },
      config: {
        rules: [
          'Do not set a chart title. The primary metric name is the painted title; a dashboard chrome title on a metric is redundant.',
          'A single primary number is fine. Enrich it from the same ES|QL only when it adds meaning: a `background_chart` (`type: "trend"`) when the query can show change over time; a secondary metric with dynamic coloring when there is a status, threshold, or comparison (previous period, error rate next to request count, p95 next to avg); `type: "bar"` only when progress-to-max is meaningful. Do not invent a second index or a complementary field.',
          'When a secondary metric is a trend (period-over-period change, compare-to-primary delta, or paired with a trend/sparkline background chart), hide its title: set `styling.secondary.label.visible: false` and omit `label` on the secondary metric. Keep the value and dynamic coloring. Show a secondary label only when the secondary is a different named measure (e.g. error rate next to request count).',
        ],
        coloringRules: [
          'Metric placement: set `apply_color_to: "value"` only together with a color config; do not color the background unless the user asks. When not coloring, omit both `color` and `apply_color_to` — `apply_color_to` without a color makes Lens tint the value with a default green.',
          'For clearly bounded metrics, use explicit 3-band `steps` by default. Examples: percent, ratio, CPU/memory/disk utilization, error rate, success rate, or SLO compliance.',
          'Metric charts use 3 bands; prefer "Status", "Negative", "Positive", or "Temperature" when thresholds have semantic meaning.',
          'For bounded adverse metrics like error rate %, higher values are worse; use a status/adverse palette with thresholds in the same percent scale as the metric output.',
          'For unbounded values (raw counts, bytes, durations, throughput, rates with unknown scale), fall back to the default policy: `color: { type: "auto" }` or no color.',
        ],
        options: {
          coloring: {
            dynamic: { recommendedStepCount: 3 },
          },
        },
      },
    },
  },
  [SupportedChartType.Gauge]: {
    schema: gaugeConfigSchemaESQL,
    prompt: {
      selection:
        'Displays a single metric within a range with optional min/max/goal bounds. Choose when showing progress toward a goal or performance against thresholds (e.g. "CPU usage as a gauge", "sales target progress").',
      config: {
        rules: [
          "Always omit the optional 'min' and 'max' fields from the final configuration.",
          'Do not infer, synthesize, or backfill gauge bounds from the ES|QL results or the user request.',
          'Only include goal/target-related fields when the user explicitly asks for a goal or threshold.',
        ],
        coloringRules: [
          'Gauge default: mirror Lens with `range: "percentage"` and exactly 4 bands: `0 <= value < 25`, `25 <= value < 50`, `50 <= value < 75`, `75 <= value <= 100`.',
          'If the user asks for a non-default gauge palette, keep those same percentage bands and only change the step colors.',
          'Do not invent absolute gauge thresholds from units like bytes, requests, or rates unless the user gave those thresholds.',
        ],
        options: {
          coloring: {
            dynamic: { recommendedStepCount: 4 },
          },
        },
      },
    },
  },
  [SupportedChartType.XY]: {
    schema: xyConfigSchemaESQL,
    prompt: {
      selection:
        'Line, bar, or area charts with X and Y axes. Choose for time series, trends, comparisons across series, or distributions/histograms (e.g. "request count over time", "sales by region as a bar chart").',
      review: {
        misses: [
          'A solid area fill on the painted chart is a miss.',
          'A visible legend on a one-series categorical chart is a miss.',
        ],
      },
      config: {
        rules: [
          'For horizontal bars, use type: "bar_horizontal" with x = category field and y = metric field. Example: "top OS by count as horizontal bar" → type: "bar_horizontal", x: { column: "OS" }, y: [{ column: "Count" }]. Do NOT put the metric on x.',
          'Do NOT set axis titles. Rely on the visualization title and column labels to convey meaning. Set axis title visibility to false (e.g. { visible: false }) for both X and Y axes.',
          'For area series, set `styling.areas.fill: "gradient"` rather than solid.',
          'Default legend rules: Place outside at the bottom. Omit legend.layout.type. Set legend.visibility: "auto" unless legend statistics are set - then set it to "visible".',
          'When the user asks for avg, min, max, last value, or other series statistics on a time-series trend, set legend.statistics (e.g. ["avg", "min", "max", "last_non_null_value"]) and legend.visibility: "visible". Do NOT bind extra Y columns for those statistics — they are computed by Lens from the series, not from extra ES|QL columns.',
        ],
        coloringRules: [
          'For new XY charts, omit explicit `color` properties and let Lens apply its current default palettes. Only add colors when the user explicitly requests them.',
          'When editing an existing XY chart, preserve its existing explicit colors unless the user asks to change them; do not introduce new color overrides.',
          'Never introduce or switch to legacy palette IDs (`eui_amsterdam`, `kibana_v7_legacy`, or `elastic_brand_2023`).',
        ],
      },
    },
  },
  [SupportedChartType.Heatmap]: {
    schema: heatmapConfigSchemaESQL,
    prompt: {
      selection:
        'Colors a two-dimensional grid of x/y buckets by metric magnitude. Choose when both axes are buckets (categorical or time) and color should convey density or intensity (e.g. "errors by service and status code", "requests by hour of day and day of week").',
      config: {
        coloringRules: [
          'Lens binds heatmap colors to the data automatically using the "Temperature" palette; keep that default (omit `color` or use `color: { type: "auto" }`) and generate explicit `steps` only when the user requests a custom palette or gives thresholds.',
        ],
        options: {
          coloring: {
            dynamic: { recommendedStepCount: 5 },
          },
        },
      },
    },
  },
  [SupportedChartType.Tagcloud]: {
    schema: tagcloudConfigSchemaESQL,
    prompt: {
      selection:
        'Displays terms sized by frequency or value. Choose only when the terms are short strings (tags, status codes, country codes, browsers). Do not use for long text such as error messages, URLs, or log lines — use a table instead.',
    },
  },
  [SupportedChartType.RegionMap]: {
    schema: regionMapConfigSchemaESQL,
    prompt: {
      selection:
        'Choropleth map coloring geographic boundaries (country, state, county) by a metric. Choose when the data has region identifiers that join to map boundaries and a map view is expected (e.g. "revenue by state on a map").',
    },
  },
  [SupportedChartType.Datatable]: {
    schema: datatableConfigSchemaESQL,
    prompt: {
      selection:
        'Structured table with sortable columns. Choose when precise values, sortable columns, or multi-dimensional breakdowns matter more than visual patterns (e.g. "list top 20 hosts by CPU usage").',
      review: {
        misses: ['Invented custom cell or text colors are a miss.'],
        considerations: [
          'Consider setting width from the number of columns (`w: 24` or `w: 48`). More columns → closer to 48. Prefer not shrinking a table below 24.',
        ],
      },
      config: {
        coloringRules: [
          'Datatable placement: prefer `apply_color_to: "badge"`; avoid cell background or text coloring unless the user asks.',
          'Numeric datatable columns: when coloring is useful, use `apply_color_to: "badge"` with `color: { type: "auto" }` so Lens computes stops from table data.',
          'Categorical datatable columns: when coloring is useful, use `color: { mode: "categorical", palette: "<palette id>", mapping: [] }` so Lens assigns colors to actual values.',
        ],
        options: {
          coloring: {
            dynamic: { recommendedStepCount: 5 },
            categorical: true,
          },
        },
      },
    },
  },
  [SupportedChartType.Pie]: {
    schema: pieConfigSchemaESQL,
    prompt: {
      selection:
        'Pie or donut showing part-to-whole proportions as slices. Choose for percentage breakdowns with a limited number of categories, ideally fewer than 7 (e.g. "traffic distribution by browser as a donut").',
      review: {
        misses: ['Invented per-slice or custom colors are a miss.'],
      },
      config: {
        coloringRules: [
          'Omit explicit `color` properties and use the Lens default palette. Only add colors when the user explicitly requests them.',
        ],
      },
    },
  },
  [SupportedChartType.Treemap]: {
    schema: treemapConfigSchemaESQL,
    prompt: {
      selection:
        'Nested rectangles where area encodes magnitude. Choose for size comparisons across many categories or hierarchical breakdowns (e.g. "disk usage by folder", "log volume by service and host").',
    },
  },
  [SupportedChartType.Waffle]: {
    schema: waffleConfigSchemaESQL,
    prompt: {
      selection:
        'Grid of small squares where the filled share encodes a proportion. Choose for intuitive single-percentage displays that read easier than pie charts (e.g. "percentage of requests that are errors").',
    },
  },
  [SupportedChartType.Mosaic]: {
    schema: mosaicConfigSchemaESQL,
    prompt: {
      selection:
        'Tiled rectangles where area and position encode the joint distribution of two categorical dimensions. Choose for cross-tabulations (e.g. "request methods by status code", "error distribution across services and environments").',
    },
  },
};

export type VisualizationConfig = z.output<ChartTypeRegistry[SupportedChartType]['schema']>;
