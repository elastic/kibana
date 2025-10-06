/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider } from '@kbn/onechat-server';

export async function getChartType(
  modelProvider: ModelProvider,
  existingType: string,
  nlQuery: string
) {
  const model = await modelProvider.getDefaultModel();
  const chartTypeResponse = await model.chatModel.invoke([
    {
      role: 'system',
      content: `You are a data visualization expert. Based on the user's query, suggest the most appropriate chart type from the following options: metric, gauge, tagcloud, pie.

Respond with ONLY the chart type name, nothing else.

Guidelines:
- metric: For single numeric values, KPIs, or metrics with optional trend lines
- gauge: For progress indicators, goals, or values with min/max ranges
- tagcloud: For displaying word frequencies or categorical data
- pie: For showing proportions or parts of a whole`,
    },
    {
      role: 'user',
      content: existingType
        ? `Existing chart type to modify: ${existingType}\n\nUser query: ${nlQuery}`
        : nlQuery,
    },
  ]);

  const suggestedType = chartTypeResponse.content.toString().trim().toLowerCase();

  return suggestedType;
}
