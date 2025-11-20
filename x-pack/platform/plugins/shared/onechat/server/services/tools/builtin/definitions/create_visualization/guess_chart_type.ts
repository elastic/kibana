/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { ModelProvider } from '@kbn/onechat-server';
import { SupportedChartType } from '@kbn/onechat-common/tools/tool_result';

const chartTypeSchema = z
  .object({
    chartType: z
      .enum([SupportedChartType.Metric, SupportedChartType.Map])
      .describe('The most appropriate chart type for the visualization'),
    reasoning: z
      .string()
      .optional()
      .describe('Brief explanation for why this chart type was selected'),
  })
  .describe('Chart type selection for data visualization');

export async function guessChartType(
  modelProvider: ModelProvider,
  existingType: string,
  nlQuery: string
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
- map: For displaying geospatial data on a map. Use this when the query involves geographic locations, coordinates, or spatial data visualization.

Guidelines:
- Choose 'metric' for numerical statistics, aggregations, counts, or KPIs
- Choose 'map' when the query explicitly mentions locations, maps, geographic areas, or spatial data
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
