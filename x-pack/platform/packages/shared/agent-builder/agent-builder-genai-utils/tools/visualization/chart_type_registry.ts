/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { esqlMetricState } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/metric';
import { gaugeStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/gauge';
import { tagcloudStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/tagcloud';
import { xyStateSchema } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/xy';
import { regionMapStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/region_map';
import { heatmapStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/heatmap';
import { datatableStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/datatable';
import { pieStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/pie';
import { treemapStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/treemap';
import { waffleStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/waffle';
import { mosaicStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/mosaic';

interface ChartTypeRegistryEntry {
  schema: { validate: (config: unknown) => any; getSchema: () => any };
  guidance: { description: string; guideline: string };
}

/**
 * Central registry for all supported chart types.
 *
 * To add a new chart type:
 * 1. Add its value to the `SupportedChartType` enum in agent-builder-common
 * 2. Ensure the ESQL schema is exported from kbn-lens-embeddable-utils
 * 3. Add one entry here with the schema import and LLM guidance
 *
 * TypeScript enforces exhaustiveness via `satisfies Record<SupportedChartType, ...>` —
 * a missing entry is a compile error.
 */
export const chartTypeRegistry = {
  [SupportedChartType.Metric]: {
    schema: esqlMetricState,
    guidance: {
      description:
        'For displaying single numeric values, KPIs, or metrics with optional trend lines. Best for showing key performance indicators, counts, sums, averages, or other aggregate statistics.',
      guideline:
        "Choose 'metric' for single numerical statistics, aggregations, counts, or KPIs without ranges",
    },
  },
  [SupportedChartType.Gauge]: {
    schema: gaugeStateSchemaESQL,
    guidance: {
      description:
        'For displaying a single metric value within a range with min/max/goal values. Best for showing progress, performance against targets, or values within bounds (e.g., "show CPU usage as a gauge", "display sales target progress").',
      guideline:
        "Choose 'gauge' when showing a value within a range, progress toward a goal, or performance against min/max thresholds",
    },
  },
  [SupportedChartType.XY]: {
    schema: xyStateSchema,
    guidance: {
      description:
        'For displaying time series, trends, comparisons, or distributions using line charts, bar charts, or area charts. Best for showing data over time, comparing multiple series, histograms, or any visualization with X and Y axes (e.g., "show request count over time", "compare sales by region as a bar chart", "display CPU usage trend as a line chart").',
      guideline:
        "Choose 'xy' when showing trends over time, comparing multiple data series, or displaying distributions with axes",
    },
  },
  [SupportedChartType.Heatmap]: {
    schema: heatmapStateSchemaESQL,
    guidance: {
      description:
        'For showing density or intensity across two dimensions (x and y buckets) using color to encode metric values. Best for correlations, distribution grids, calendar heatmaps, or when both axes are categorical/time buckets and color represents magnitude (e.g., "errors by service by status code", "requests by hour of day and day of week").',
      guideline:
        "Choose 'heatmap' when both axes are buckets and you want to visualize density/intensity with color across the x/y grid",
    },
  },
  [SupportedChartType.Tagcloud]: {
    schema: tagcloudStateSchemaESQL,
    guidance: {
      description:
        'For displaying word frequency or categorical data where text size represents value. Best for showing top terms, keywords, categories, or text-based aggregations (e.g., "show top error messages", "display most common tags").',
      guideline:
        "Choose 'tagcloud' when visualizing text/categorical data where frequency or count determines size",
    },
  },
  [SupportedChartType.RegionMap]: {
    schema: regionMapStateSchemaESQL,
    guidance: {
      description:
        'For choropleth or region-based maps that show a metric by geographic boundary (country, state, province, county, etc.). Best when the data includes region identifiers that can be joined to map boundaries (e.g., "show revenue by state on a map", "display incidents by country").',
      guideline:
        "Choose 'region_map' when comparing metrics across geographic regions and a map-based view is expected",
    },
  },
  [SupportedChartType.Datatable]: {
    schema: datatableStateSchemaESQL,
    guidance: {
      description:
        'For displaying data in a structured table format with sortable columns. Best for showing detailed records, precise numeric comparisons, or multi-dimensional breakdowns where exact values matter more than visual patterns (e.g., "list top 20 hosts by CPU usage", "show error counts by service and status code").',
      guideline:
        "Choose 'datatable' when the user needs precise values, sortable columns, or a spreadsheet-like view of the data",
    },
  },
  [SupportedChartType.Pie]: {
    schema: pieStateSchemaESQL,
    guidance: {
      description:
        'For showing proportional composition or part-to-whole relationships as slices of a circle. Supports pie and donut variants. Best for showing percentage breakdowns with a small number of categories (e.g., "show traffic distribution by browser", "display error proportion by type as a donut chart").',
      guideline:
        "Choose 'pie' when showing part-to-whole proportions with a limited number of categories (ideally fewer than 7)",
    },
  },
  [SupportedChartType.Treemap]: {
    schema: treemapStateSchemaESQL,
    guidance: {
      description:
        'For showing hierarchical or proportional data as nested rectangles where area encodes magnitude. Best for visualizing size comparisons across categories with optional hierarchical grouping (e.g., "show disk usage by folder", "display log volume by service and host").',
      guideline:
        "Choose 'treemap' when comparing relative sizes across many categories or showing hierarchical breakdowns",
    },
  },
  [SupportedChartType.Waffle]: {
    schema: waffleStateSchemaESQL,
    guidance: {
      description:
        'For showing proportional data as a grid of small squares where filled squares represent the proportion. Best for intuitive percentage displays that are easier to read than pie charts (e.g., "show what percentage of requests are errors", "display completion rate").',
      guideline:
        "Choose 'waffle' when showing percentages or proportions in a visually intuitive grid format",
    },
  },
  [SupportedChartType.Mosaic]: {
    schema: mosaicStateSchemaESQL,
    guidance: {
      description:
        'For showing the relationship between two categorical variables using a tiled mosaic of rectangles where both area and position encode information. Best for cross-tabulation views (e.g., "show error distribution across services and environments", "display request methods by status code").',
      guideline:
        "Choose 'mosaic' when visualizing the joint distribution of two categorical dimensions",
    },
  },
} satisfies Record<SupportedChartType, ChartTypeRegistryEntry>;

export type ChartTypeRegistry = typeof chartTypeRegistry;

export type VisualizationConfig = ReturnType<
  ChartTypeRegistry[SupportedChartType]['schema']['validate']
>;
