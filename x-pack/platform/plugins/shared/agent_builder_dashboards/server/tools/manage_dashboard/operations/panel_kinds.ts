/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';

export const markdownPanelInputSchema = z.object({
  kind: z.literal('markdown'),
  markdownContent: z.string().describe('Markdown content for the panel.'),
  grid: panelGridSchema,
});

export const attachmentPanelInputSchema = z.object({
  kind: z.literal('attachment'),
  attachmentId: z.string().describe('Visualization attachment ID to add as a dashboard panel.'),
  grid: panelGridSchema,
});

export const visualizationPanelBaseInputSchema = z.object({
  query: z.string().describe('A natural language query describing the desired visualization.'),
  index: z
    .string()
    .optional()
    .describe(
      '(optional) Index, alias, or datastream to target. If not provided, the tool will attempt to discover the best index to use.'
    ),
  chartType: z
    .nativeEnum(SupportedChartType)
    .optional()
    .describe(
      '(optional) The type of chart to create as indicated by the user. If not provided, the LLM will suggest the best chart type.'
    ),
  esql: z
    .string()
    .optional()
    .describe(
      '(optional) A validated ES|QL query from a prior tool result or explicit user input. Omit this field when composing new visualizations — the tool generates the query from the natural language query. NEVER write or invent an ES|QL query yourself.'
    ),
  grid: panelGridSchema,
});

export const visualizationPanelInputSchema = visualizationPanelBaseInputSchema.extend({
  kind: z.literal('visualization'),
});

export type VisualizationPanelInput = z.infer<typeof visualizationPanelInputSchema>;
