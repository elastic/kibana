/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { ModelProvider } from '@kbn/agent-builder-server';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';

const chartTypeSchema = z
  .object({
    chartType: z
      .enum([
        SupportedChartType.Metric,
        SupportedChartType.Gauge,
        SupportedChartType.Tagcloud,
        SupportedChartType.XY,
        SupportedChartType.RegionMap,
        SupportedChartType.Heatmap,
      ])
      .describe('The most appropriate chart type for the visualization'),
    reasoning: z
      .string()
      .optional()
      .describe('Brief explanation for why this chart type was selected'),
  })
  .describe('Chart type selection for data visualization');

export async function guessChartType(
  modelProvider: ModelProvider,
  nlQuery: string,
  existingType?: string
) {
  const model = await modelProvider.getDefaultModel();

  // Create a structured output model
  const structuredModel = model.chatModel.withStructuredOutput(chartTypeSchema, {
    name: 'select_chart_type',
  });

  const response = await structuredModel.invoke([
    {
      role: 'system',
      content: `You are a data visualization expert. Based on the user's query, suggest the most appropriate chart type from the available options.

You MUST call the 'select_chart_type' tool to provide your chart type selection. Do NOT respond with plain text.

Available chart types:
- metric: For displaying single numeric values, KPIs, or metrics with optional trend lines. Best for showing key performance indicators, counts, sums, averages, or other aggregate statistics.
- gauge: For displaying a single metric value within a range with min/max/goal values. Best for showing progress, performance against targets, or values within bounds (e.g., "show CPU usage as a gauge", "display sales target progress").
- tagcloud: For displaying word frequency or categorical data where text size represents value. Best for showing top terms, keywords, categories, or text-based aggregations (e.g., "show top error messages", "display most common tags").
- xy: For displaying time series, trends, comparisons, or distributions using line charts, bar charts, or area charts. Best for showing data over time, comparing multiple series, histograms, or any visualization with X and Y axes (e.g., "show request count over time", "compare sales by region as a bar chart", "display CPU usage trend as a line chart").
- heatmap: For showing density or intensity across two dimensions (x and y buckets) using color to encode metric values. Best for correlations, distribution grids, calendar heatmaps, or when both axes are categorical/time buckets and color represents magnitude (e.g., "errors by service by status code", "requests by hour of day and day of week").
- region_map: For choropleth or region-based maps that show a metric by geographic boundary (country, state, province, county, etc.). Best when the data includes region identifiers that can be joined to map boundaries (e.g., "show revenue by state on a map", "display incidents by country").

Guidelines:
- Choose 'metric' for single numerical statistics, aggregations, counts, or KPIs without ranges
- Choose 'gauge' when showing a value within a range, progress toward a goal, or performance against min/max thresholds
- Choose 'tagcloud' when visualizing text/categorical data where frequency or count determines size
- Choose 'region_map' when comparing metrics across geographic regions and a map-based view is expected
- Choose 'heatmap' when both axes are buckets and you want to visualize density/intensity with color across the x/y grid
- Choose 'xy' when showing trends over time, comparing multiple data series, or displaying distributions with axes
- Consider the user's intent and the nature of the data being visualized
${existingType ? `- The existing chart type is: ${existingType}` : ''}`,
    },
    {
      role: 'user',
      content: existingType
        ? `Existing chart type to modify: ${existingType}\n\nUser query: ${nlQuery}`
        : nlQuery,
    },
  ]);

  let selectedChartType: SupportedChartType = SupportedChartType.Metric;
  if (Object.values(SupportedChartType).includes(response.chartType as SupportedChartType)) {
    selectedChartType = response.chartType as SupportedChartType;
  }

  return selectedChartType;
}
