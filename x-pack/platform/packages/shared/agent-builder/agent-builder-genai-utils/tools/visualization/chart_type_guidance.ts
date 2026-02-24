/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';

interface ChartTypeGuidance {
  description: string;
  guideline: string;
}

/**
 * Central chart-type guidance source used by both:
 * - chart type selection prompting in visualization generation
 * - chart type guidance content in dashboard management skill text
 */
const chartTypeGuidance: Record<SupportedChartType, ChartTypeGuidance> = {
  [SupportedChartType.Metric]: {
    description:
      'For displaying single numeric values, KPIs, or metrics with optional trend lines. Best for showing key performance indicators, counts, sums, averages, or other aggregate statistics.',
    guideline:
      "Choose 'metric' for single numerical statistics, aggregations, counts, or KPIs without ranges",
  },
  [SupportedChartType.Gauge]: {
    description:
      'For displaying a single metric value within a range with min/max/goal values. Best for showing progress, performance against targets, or values within bounds (e.g., "show CPU usage as a gauge", "display sales target progress").',
    guideline:
      "Choose 'gauge' when showing a value within a range, progress toward a goal, or performance against min/max thresholds",
  },
  [SupportedChartType.XY]: {
    description:
      'For displaying time series, trends, comparisons, or distributions using line charts, bar charts, or area charts. Best for showing data over time, comparing multiple series, histograms, or any visualization with X and Y axes (e.g., "show request count over time", "compare sales by region as a bar chart", "display CPU usage trend as a line chart").',
    guideline:
      "Choose 'xy' when showing trends over time, comparing multiple data series, or displaying distributions with axes",
  },
  [SupportedChartType.Heatmap]: {
    description:
      'For showing density or intensity across two dimensions (x and y buckets) using color to encode metric values. Best for correlations, distribution grids, calendar heatmaps, or when both axes are categorical/time buckets and color represents magnitude (e.g., "errors by service by status code", "requests by hour of day and day of week").',
    guideline:
      "Choose 'heatmap' when both axes are buckets and you want to visualize density/intensity with color across the x/y grid",
  },
  [SupportedChartType.Tagcloud]: {
    description:
      'For displaying word frequency or categorical data where text size represents value. Best for showing top terms, keywords, categories, or text-based aggregations (e.g., "show top error messages", "display most common tags").',
    guideline:
      "Choose 'tagcloud' when visualizing text/categorical data where frequency or count determines size",
  },
  [SupportedChartType.RegionMap]: {
    description:
      'For choropleth or region-based maps that show a metric by geographic boundary (country, state, province, county, etc.). Best when the data includes region identifiers that can be joined to map boundaries (e.g., "show revenue by state on a map", "display incidents by country").',
    guideline:
      "Choose 'region_map' when comparing metrics across geographic regions and a map-based view is expected",
  },
};

export const getChartTypeSelectionPromptContent = () =>
  [
    'Available chart types:',
    ...Object.entries(chartTypeGuidance).map(
      ([chartType, guidance]) => `- ${chartType}: ${guidance.description}`
    ),
    '',
    'Guidelines:',
    ...Object.entries(chartTypeGuidance).map(([, guidance]) => `- ${guidance.guideline}`),
    "- Consider the user's intent and the nature of the data being visualized",
  ].join('\n');
