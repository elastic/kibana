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
     * Chart-specific presentation rules for the Lens config author, including
     * color policy, stated in Lens JSON terms.
     */
    rules?: string[];
    /**
     * Coloring modes the chart supports. Drives the author-only color mechanics
     * and palette previews compiled by `color_palettes.ts`.
     */
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

const panelTitleRule =
  'Set the top-level `title` to a concise panel title naming the measure and breakdown. Category labels do not replace it.';

const noPanelTitleRule = (reason: string): string =>
  `Omit the top-level \`title\`, because ${reason}.`;

/**
 * Central registry for all supported chart types: schema, selection text, and
 * presentation rules. `chart_type_guidance.ts` compiles the rules into the
 * config author's prompt.
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
      rules: [
        noPanelTitleRule('the primary metric label already names the panel'),
        'A single number is fine. When the value benefits from context, add a trend background (`background_chart: { type: "trend" }`) or a secondary metric (a second `metrics[]` entry with `type: "secondary"`) bound to columns the same ES|QL query returns. Never invent another index or field.',
        'For a secondary trend or delta, hide the label with `styling.secondary.label.visible: false` and omit `label`. Label a secondary metric only when it is a distinct named measure.',
        'Omit `color` by default. Bounded metrics (percent, ratio, utilization, error/success rate, SLO compliance) are the usual exception. When such a measure reads as good or bad, apply explicit 3-band `steps` using "Status", "Negative", "Positive", or "Temperature", with a status or adverse palette when higher is worse. Take thresholds from the query or context when available, otherwise use conventional bands for the measure, in the same unit and scale as the metric output. Unbounded values (counts, bytes, durations, rates with unknown scale) stay uncolored unless the user asks.',
        'Color the value, never the background. Set `apply_color_to: "value"` in the same edit that sets the `color` config. Never set `apply_color_to` on its own, because without a `color` config Lens tints the value with a default green that carries no meaning. When a metric is not colored, omit both `color` and `apply_color_to`.',
      ],
      coloring: {
        dynamic: { recommendedStepCount: 3 },
      },
    },
  },
  [SupportedChartType.Gauge]: {
    schema: gaugeConfigSchemaESQL,
    prompt: {
      selection:
        'Displays a single metric within a range with optional min/max/goal bounds. Choose when showing progress toward a goal or performance against thresholds (e.g. "CPU usage as a gauge", "sales target progress").',
      rules: [
        noPanelTitleRule('the gauge label names the measure'),
        'Omit `min`, `max`, and `goal` unless supplied or meaningful in the existing configuration. Never invent business targets from the data or units.',
        'The default bands are `range: "percentage"` with 4 steps: `0 <= value < 25`, `25 <= value < 50`, `50 <= value < 75`, `75 <= value <= 100`. During enhancement, restore these unless existing thresholds are meaningful for the measure. A focused palette-only edit changes step colors while preserving the step count, boundaries, and `range`.',
      ],
      coloring: {
        dynamic: { recommendedStepCount: 4 },
      },
    },
  },
  [SupportedChartType.XY]: {
    schema: xyConfigSchemaESQL,
    prompt: {
      selection:
        'Line, bar, or area charts with X and Y axes. Choose for time series, trends, comparisons across series, or distributions/histograms (e.g. "request count over time", "average CPU over time", "sales by region as a bar chart"). Avg/min/max *in the legend* is still xy, not a combination chart.',
      rules: [
        panelTitleRule,
        'Hide axis titles by setting `title: { visible: false }` on both the x and y axes, and do not set axis title text.',
        'Area series use `styling.areas.fill: "gradient"`, never solid.',
        'Set `legend.position: "bottom"` and keep the default outside placement. Use `legend.layout: { type: "list" }` without legend statistics and `legend.layout: { type: "grid" }` when statistics are set, so the values line up in columns. Always set `legend.visibility`, because an unset value hides the legend entirely. Use `"auto"` so Lens shows the legend for multiple series and hides it for a single series. Use `"visible"` instead when legend statistics are set.',
        'Use the default Lens palette by omitting explicit `color` properties. During enhancement, remove all custom palettes and series color overrides. Add colors only when requested, and never use legacy palette IDs (`eui_amsterdam`, `kibana_v7_legacy`, or `elastic_brand_2023`).',
        'For horizontal bars, use type: "bar_horizontal" with x = category field and y = metric field. Example: "top OS by count as horizontal bar" → type: "bar_horizontal", x: { column: "OS" }, y: [{ column: "Count" }]. Do NOT put the metric on x.',
        seriesStatisticsLensConfigRule,
      ],
    },
  },
  [SupportedChartType.Heatmap]: {
    schema: heatmapConfigSchemaESQL,
    prompt: {
      selection:
        'Colors a two-dimensional grid of x/y buckets by metric magnitude. Choose when both axes are buckets (categorical or time) and color should convey density or intensity (e.g. "errors by service and status code", "requests by hour of day and day of week").',
      rules: [
        panelTitleRule,
        'Keep the default "Temperature" palette by omitting `color` or using `color: { type: "auto" }`. Generate explicit `steps` only when the user requests a custom palette or gives thresholds.',
      ],
      coloring: {
        dynamic: { recommendedStepCount: 5 },
      },
    },
  },
  [SupportedChartType.Tagcloud]: {
    schema: tagcloudConfigSchemaESQL,
    prompt: {
      selection:
        'Displays terms sized by frequency or value. Choose only when the terms are short strings (tags, status codes, country codes, browsers). Do not use for long text such as error messages, URLs, or log lines — use a table instead.',
      rules: [noPanelTitleRule('the labels within the tag cloud already name the content')],
    },
  },
  [SupportedChartType.RegionMap]: {
    schema: regionMapConfigSchemaESQL,
    prompt: {
      selection:
        'Choropleth map coloring geographic boundaries (country, state, county) by a metric. Choose when the data has region identifiers that join to map boundaries and a map view is expected (e.g. "revenue by state on a map").',
      rules: [panelTitleRule],
    },
  },
  [SupportedChartType.Datatable]: {
    schema: datatableConfigSchemaESQL,
    prompt: {
      selection:
        'Structured table with sortable columns. Choose when precise values, sortable columns, or multi-dimensional breakdowns matter more than visual patterns (e.g. "list top 20 hosts by CPU usage").',
      rules: [
        panelTitleRule,
        'Color only where it adds meaning (status, severity, magnitude), and only as badges. Numeric columns use `apply_color_to: "badge"` with `color: { type: "auto" }` so Lens computes stops from table data. Categorical columns use `color: { mode: "categorical", palette: "<palette id>", mapping: [] }` so Lens assigns colors to actual values. Do not color cell backgrounds or text unless the user asks.',
      ],
      coloring: {
        dynamic: { recommendedStepCount: 5 },
        categorical: true,
      },
    },
  },
  [SupportedChartType.Pie]: {
    schema: pieConfigSchemaESQL,
    prompt: {
      selection:
        'Pie or donut showing part-to-whole proportions as slices. Choose for percentage breakdowns with a limited number of categories, ideally fewer than 7 (e.g. "traffic distribution by browser as a donut").',
      rules: [
        panelTitleRule,
        'Omit explicit `color` properties so Lens applies its default palette. Add colors only when the user explicitly asks.',
        'Omit `legend` entirely so Lens applies its defaults, including during enhancement. Drop any existing `legend` block rather than carrying it over. Set `legend` only when the user explicitly asks for a legend change, and then set only the requested property.',
      ],
    },
  },
  [SupportedChartType.Treemap]: {
    schema: treemapConfigSchemaESQL,
    prompt: {
      selection:
        'Nested rectangles where area encodes magnitude. Choose for size comparisons across many categories or hierarchical breakdowns (e.g. "disk usage by folder", "log volume by service and host").',
      rules: [panelTitleRule],
    },
  },
  [SupportedChartType.Waffle]: {
    schema: waffleConfigSchemaESQL,
    prompt: {
      selection:
        'Grid of small squares where the filled share encodes a proportion. Choose for intuitive single-percentage displays that read easier than pie charts (e.g. "percentage of requests that are errors").',
      rules: [noPanelTitleRule('the labels within the waffle chart already name the content')],
    },
  },
  [SupportedChartType.Mosaic]: {
    schema: mosaicConfigSchemaESQL,
    prompt: {
      selection:
        'Tiled rectangles where area and position encode the joint distribution of two categorical dimensions. Choose for cross-tabulations (e.g. "request methods by status code", "error distribution across services and environments").',
      rules: [panelTitleRule],
    },
  },
};

export type VisualizationConfig = z.output<ChartTypeRegistry[SupportedChartType]['schema']>;
