/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { IndexField } from '../state';

/**
 * Creates a prompt for planning dashboard visualizations based on user query.
 * Includes discovered index and field information for accurate planning.
 */
export function createPlanVisualizationsPrompt({
  query,
  title,
  description,
  index,
  fields,
}: {
  query: string;
  title: string;
  description: string;
  index?: string;
  fields?: IndexField[];
}): BaseMessageLike[] {
  const fieldContext =
    fields && fields.length > 0 ? `\n## Available Fields\n${JSON.stringify(fields)}` : '';

  const indexContext = index ? `\n## Target Index\n${index}` : '';

  return [
    [
      'system',
      `You are a Kibana dashboard planning expert. Your task is to plan visualizations for a dashboard based on the user's request.

## Dashboard Context
Title: ${title}
Description: ${description}${indexContext}${fieldContext}

## Your Task
Based on the user's request and the available data, plan 2-6 visualizations that would create a useful dashboard. Each visualization should:
1. Use the target index and available fields listed above
2. Match field types to appropriate visualizations (e.g., date fields for time series, keyword fields for breakdowns)
3. Provide valuable insights for the user's goal
4. Have a clear, descriptive title

You MUST call the 'plan_visualizations' tool to provide your planned panels. Do NOT respond with plain text.

Guidelines:
- Use ONLY fields that are available in the index (listed above)
- The description should be detailed enough for a visualization tool to create the chart
- Always include the index name and specific field names in the description
- Match field types to chart types (use date fields for time axes, numeric for metrics, keyword for breakdowns)`,
    ],
    ['human', `Plan visualizations for this dashboard request: ${query}`],
  ];
}

/**
 * Creates a prompt for generating markdown summary content for the dashboard.
 */
export function createMarkdownSummaryPrompt({
  title,
  description,
  query,
  plannedPanels,
}: {
  title: string;
  description: string;
  query: string;
  plannedPanels: Array<{ title?: string; description: string }>;
}): BaseMessageLike[] {
  const panelList = plannedPanels.map((p, i) => `${i + 1}. ${p.title || p.description}`).join('\n');

  return [
    [
      'system',
      `You are a technical writer creating a brief markdown summary for a Kibana dashboard.

Create a concise markdown summary (3-6 lines) that:
1. Starts with a heading (##)
2. Briefly describes what the dashboard shows
3. Lists the key insights or metrics the user can expect

Keep it brief and informative. Do not use backticks or code blocks in the content.`,
    ],
    [
      'human',
      `Create a markdown summary for this dashboard:

Title: ${title}
Description: ${description}
User Request: ${query}

Planned Visualizations:
${panelList}`,
    ],
  ];
}
