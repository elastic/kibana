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
import { seriesStatisticsLensConfigRule } from '../shared/series_statistics_prompt';

interface ChartTypeRegistryEntry<T extends z.ZodType> {
  schema: T;
  prompt: {
    /**
     * One-line "what it shows and when to choose it" used when selecting the
     * best chart type for a user request.
     */
    selection: string;
    /**
     * Presentation preferences shared by the panel reviewer and Lens config author, without Lens JSON.
     */
    design?: string[];
    /**
     * How to express the design choices in Lens config JSON. Only the Lens
     * config author sees this. It carries out the design above and must not
     * introduce a second, independent design policy.
     */
    config?: {
      /**
       * Chart-specific structural rules appended to the config-generation prompt.
       */
      rules?: string[];
      /**
       * Chart-specific coloring rules rendered inside the color section of the
       * config-generation prompt.
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
 * chart-specific prompt guidance, split into the shared `design` (what a good
 * chart looks like) and the author-only `config` (how to express it in Lens
 * JSON). See `chart_type_guidance.ts` for how each role's prompt is compiled.
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
      design: [
        'No panel title: the primary metric label already names the panel.',
        'A single number is fine. When the query results support it and the value benefits from context, add a trend background or a secondary metric instead of leaving a lone number on white.',
        'Show a progress bar only when the value has a meaningful maximum.',
        'A secondary trend or delta needs no label; label a secondary metric only when it is a distinct named measure.',
        'Color the value, not the background, and only when it carries meaning. Clearly bounded metrics (percent, ratio, CPU/memory/disk utilization, error rate, success rate, SLO compliance) benefit from status bands in the same scale as the value; for adverse metrics such as error rate, higher is worse. Unbounded values (raw counts, bytes, durations, throughput, rates with unknown scale) stay uncolored.',
      ],
      config: {
        rules: [
          'Trend backgrounds (`background_chart: { type: "trend" }`) and secondary metrics (a second `metrics[]` entry with `type: "secondary"`) must bind columns the same ES|QL query returns. Never invent another index or field.',
          'Progress bar: `background_chart` with `type: "bar"` and a `max_value` column, only for meaningful progress-to-max.',
          'For trend/delta secondary metrics, hide the label with `styling.secondary.label.visible: false` and omit `label`.',
        ],
        coloringRules: [
          'Set `apply_color_to: "value"` only together with a `color` config; do not color the background unless the user asks. When not coloring, omit both `color` and `apply_color_to` — `apply_color_to` without a color makes Lens tint the value with a default green.',
          'Bounded metrics: explicit 3-band `steps` with thresholds in the same unit and scale as the metric output (percent thresholds for percent values). Prefer "Status", "Negative", "Positive", or "Temperature" when thresholds have semantic meaning; use a status/adverse palette for adverse metrics.',
          'Unbounded values: `color: { type: "auto" }` or no color.',
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
      design: [
        'Gauge bounds and goals describe business targets. Never invent, infer, or backfill minimum, maximum, or goal values from the data or from units like bytes, requests, or rates; set them only when the user provides them, and keep existing ones on edits.',
        'For new gauges, prefer four equal percentage color bands unless the user specifies different bands. When prettifying, request four equal percentage bands explicitly unless the existing bands reflect explicit user thresholds or meaningful business ranges. A focused color or palette edit keeps the existing band count, thresholds, and percentage or absolute scale.',
      ],
      config: {
        rules: [
          'Omit `min`, `max`, and `goal` unless the user supplied them or the existing configuration already has them.',
        ],
        coloringRules: [
          'When explicit bands are needed without existing or requested bands, or an edit explicitly requests the four-band default, use `range: "percentage"` with 4 bands: `0 <= value < 25`, `25 <= value < 50`, `50 <= value < 75`, `75 <= value <= 100`. A palette-only edit changes only step colors: preserve the existing number of steps, threshold boundaries, and `range`. Change existing bands only when the instruction requests it; explicit user thresholds take precedence over defaults. Choose the band count from these rules, not from the number of colors in a palette preview.',
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
        'Line, bar, or area charts with X and Y axes. Choose for time series, trends, comparisons across series, or distributions/histograms (e.g. "request count over time", "average CPU over time", "sales by region as a bar chart"). Avg/min/max *in the legend* is still xy, not a combination chart.',
      design: [
        'No axis titles: the panel title and column labels already convey meaning.',
        'Area series use a gradient fill, never a solid fill.',
        'Place the legend outside the plot, at the bottom. Hide it when it only repeats what is visible (a single series); show it when it carries legend statistics.',
        'Let Lens assign series colors for every XY layer, including line, area, vertical bar, and horizontal bar series. During Prettify, remove existing static series colors and custom breakdown color overrides unless explicitly requested by the user or justified by clear semantic meaning. Return a concrete correction to reset those overrides to Lens defaults; do not preserve them just because they are already configured.',
      ],
      config: {
        rules: [
          'For horizontal bars, use type: "bar_horizontal" with x = category field and y = metric field. Example: "top OS by count as horizontal bar" → type: "bar_horizontal", x: { column: "OS" }, y: [{ column: "Count" }]. Do NOT put the metric on x.',
          'Hide axis titles with `title: { visible: false }` on both the x and y axes; do not set axis title text.',
          'Area series: `styling.areas.fill: "gradient"`.',
          'Legend: `legend.position: "bottom"` with the default outside placement; omit `legend.layout.type`. Leave `legend.visibility` unset (Lens auto-hides single-series legends) unless legend statistics are set — then set it to "visible".',
          seriesStatisticsLensConfigRule,
        ],
        coloringRules: [
          'Omit explicit `color` properties unless the user requested colors or a clear semantic mapping is required. When an edit requests resetting XY colors to Lens defaults, remove the affected `layers[].y[].color` and `layers[].breakdown_by.color` overrides while retaining the metrics and breakdown bindings. Use Lens defaults, not replacement hex values.',
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
      design: [
        'Keep the default "Temperature" palette that Lens binds to the data; use a custom palette or thresholds only when the user asks.',
      ],
      config: {
        coloringRules: [
          'Omit `color` or use `color: { type: "auto" }`; generate explicit `steps` only when the user requests a custom palette or gives thresholds.',
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
      design: [
        'Color table values as badges, and only where color adds meaning (status, severity, magnitude). Do not color cell backgrounds or text unless the user asks.',
      ],
      config: {
        coloringRules: [
          'Prefer `apply_color_to: "badge"`; avoid cell background or text coloring unless the user asks.',
          'Numeric columns: when coloring is useful, use `apply_color_to: "badge"` with `color: { type: "auto" }` so Lens computes stops from table data.',
          'Categorical columns: when coloring is useful, use `color: { mode: "categorical", palette: "<palette id>", mapping: [] }` so Lens assigns colors to actual values.',
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
      design: ['Use the default palette; per-slice or custom colors only when the user asks.'],
      config: {
        coloringRules: [
          'Omit explicit `color` properties; Lens applies its default palette. Add colors only when the user explicitly requests them.',
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
