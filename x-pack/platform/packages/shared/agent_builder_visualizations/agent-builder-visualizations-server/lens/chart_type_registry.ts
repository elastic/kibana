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

/**
 * One presentation rule, stated once per role. The visualization agent reads
 * `design`; the Lens config author reads `config` when present, otherwise
 * `design`. A `config` text therefore replaces the design text and must carry
 * the same intent on its own, expressed in Lens JSON terms. Rules with only a
 * `config` are author-only mechanics; rules with only a `design` are followed
 * by the author as written.
 */
export interface ChartRule {
  design?: string;
  config?: string;
}

interface ChartTypeRegistryEntry<T extends z.ZodType> {
  schema: T;
  prompt: {
    /**
     * One-line "what it shows and when to choose it" used when selecting the
     * best chart type for a user request.
     */
    selection: string;
    /**
     * Chart-specific presentation rules, including color policy.
     */
    rules?: ChartRule[];
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

const panelTitleRule: ChartRule = {
  design:
    'Include a concise panel title naming the measure and breakdown; category labels do not replace it.',
  config:
    'Set the top-level `title` to a concise panel title naming the measure and breakdown; category labels do not replace it.',
};

const noPanelTitleRule = (reason: string): ChartRule => ({
  design: `No panel title: ${reason}.`,
  config: `Omit the top-level \`title\`: ${reason}.`,
});

const defaultPaletteRule: ChartRule = {
  design: 'Use the default palette; custom colors only when the user asks.',
  config:
    'Omit explicit `color` properties so Lens applies its default palette; add colors only when the user explicitly asks.',
};

/**
 * Central registry for all supported chart types: schema, selection text, and
 * presentation rules. See `chart_type_guidance.ts` for how each role's prompt
 * is compiled from the rules.
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
        {
          design:
            'A single number is fine. When the query results support it and the value benefits from context, add a trend background or a secondary metric instead of leaving a lone number on white.',
          config:
            'A single number is fine. When the value benefits from context, add a trend background (`background_chart: { type: "trend" }`) or a secondary metric (a second `metrics[]` entry with `type: "secondary"`) bound to columns the same ES|QL query returns; never invent another index or field.',
        },
        {
          design: 'Show a progress bar only when the value has a meaningful maximum.',
          config:
            'Progress bar (`background_chart: { type: "bar" }` with a `max_value` column) only when the value has a meaningful maximum.',
        },
        {
          design:
            'A secondary trend or delta needs no label; label a secondary metric only when it is a distinct named measure.',
          config:
            'For a secondary trend or delta, hide the label with `styling.secondary.label.visible: false` and omit `label`; label a secondary metric only when it is a distinct named measure.',
        },
        {
          design: 'Color the value, not the background, and only when it carries meaning.',
          config:
            'Color the value, not the background: set `apply_color_to: "value"` only together with a `color` config, and when not coloring omit both (`apply_color_to` without a color makes Lens tint the value with a default green).',
        },
        {
          design:
            'Bounded metrics (percent, ratio, CPU/memory/disk utilization, error rate, success rate, SLO compliance) can use status bands when meaningful thresholds are supported by the query or context; for adverse metrics such as error rate, higher is worse. Unbounded values and metrics without defensible thresholds stay uncolored.',
          config:
            'Bounded metrics (percent, ratio, utilization, error/success rate, SLO compliance) with thresholds supported by the query or context: explicit 3-band `steps` in the same unit and scale as the metric output, using "Status", "Negative", "Positive", or "Temperature", with a status/adverse palette when higher is worse. Unbounded values and metrics without defensible thresholds: `color: { type: "auto" }` or no color.',
        },
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
        {
          design:
            'Gauge bounds and goals describe business targets. Use supplied or meaningful existing bounds and goals; never invent business targets from the data or units.',
          config:
            'Omit `min`, `max`, and `goal` unless supplied or meaningful in the existing configuration; never invent business targets from the data or units.',
        },
        {
          design:
            'Default to four equal percentage color bands. During enhancement, evaluate existing thresholds: retain meaningful boundaries, otherwise restore the default bands. A focused palette edit preserves boundaries and scale.',
          config:
            'Default bands: `range: "percentage"` with 4 steps: `0 <= value < 25`, `25 <= value < 50`, `50 <= value < 75`, `75 <= value <= 100`. During enhancement, restore these unless existing thresholds are meaningful for the measure. A focused palette-only edit changes step colors while preserving the step count, boundaries, and `range`.',
        },
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
        {
          design: 'No axis titles: the panel title and column labels already convey meaning.',
          config:
            'No axis titles: set `title: { visible: false }` on both the x and y axes and do not set axis title text.',
        },
        {
          design: 'Area series use a gradient fill, never a solid fill.',
          config: 'Area series: `styling.areas.fill: "gradient"`, never solid.',
        },
        {
          design:
            'Place the legend outside the plot, at the bottom. Hide it when it only repeats what is visible (a single series); show it when it carries legend statistics.',
          config:
            'Legend: `legend.position: "bottom"` with the default outside placement; omit `legend.layout.type`. Leave `legend.visibility` unset (Lens auto-hides single-series legends) unless legend statistics are set — then set it to "visible".',
        },
        {
          design:
            'Use the default Lens palette. During enhancement, remove all custom palettes and series color overrides. Outside enhancement, explicit color requests may override the default.',
          config:
            'Use the default Lens palette: omit explicit `color` properties, and during enhancement remove all custom palettes and series color overrides. Add colors only when requested, and never use legacy palette IDs (`eui_amsterdam`, `kibana_v7_legacy`, or `elastic_brand_2023`).',
        },
        {
          config:
            'For horizontal bars, use type: "bar_horizontal" with x = category field and y = metric field. Example: "top OS by count as horizontal bar" → type: "bar_horizontal", x: { column: "OS" }, y: [{ column: "Count" }]. Do NOT put the metric on x.',
        },
        { config: seriesStatisticsLensConfigRule },
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
        {
          design:
            'Keep the default "Temperature" palette that Lens binds to the data; use a custom palette or thresholds only when the user asks.',
          config:
            'Keep the default "Temperature" palette: omit `color` or use `color: { type: "auto" }`; generate explicit `steps` only when the user requests a custom palette or gives thresholds.',
        },
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
      rules: [noPanelTitleRule('use the labels within the tag cloud')],
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
        {
          design:
            'Color table values as badges, and only where color adds meaning (status, severity, magnitude). Do not color cell backgrounds or text unless the user asks.',
          config:
            'Color only where it adds meaning (status, severity, magnitude), as badges: numeric columns use `apply_color_to: "badge"` with `color: { type: "auto" }` so Lens computes stops from table data; categorical columns use `color: { mode: "categorical", palette: "<palette id>", mapping: [] }` so Lens assigns colors to actual values. Do not color cell backgrounds or text unless the user asks.',
        },
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
      rules: [panelTitleRule, defaultPaletteRule],
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
      rules: [noPanelTitleRule('use the labels within the waffle chart')],
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
