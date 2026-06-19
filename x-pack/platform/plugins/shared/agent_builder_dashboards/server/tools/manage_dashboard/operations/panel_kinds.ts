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
      '(optional) An ES|QL query. If not provided, the tool will generate the query. Only pass ES|QL queries from reliable sources (other tool calls or the user) and NEVER invent queries directly.'
    ),
  grid: panelGridSchema,
});

export const visualizationPanelInputSchema = visualizationPanelBaseInputSchema.extend({
  kind: z.literal('visualization'),
});

export type VisualizationPanelInput = z.infer<typeof visualizationPanelInputSchema>;

export const aiPanelInputSchema = z.object({
  kind: z.literal('ai_panel'),
  prompt: z
    .string()
    .describe(
      'Describe exactly what the AI panel should render. Be specific: chart type, data shape, visual style, any annotations. The LLM will generate self-contained HTML — it can produce anything: KPI cards, status boards, custom charts, tables, rich layouts, chart types Lens does not support.'
    ),
  esqlQuery: z
    .string()
    .optional()
    .describe(
      '(optional) An ES|QL query whose results are passed as live data context to the AI when the panel renders. Generate this with the generateEsql tool whenever the panel should reflect real index data.'
    ),
  grid: panelGridSchema,
});

export type AiPanelInput = z.infer<typeof aiPanelInputSchema>;

export const aiDashboardSummaryPanelInputSchema = z.object({
  kind: z.literal('ai_dashboard_summary'),
  customInstructions: z
    .string()
    .optional()
    .describe(
      '(optional) Custom instructions for the summary, e.g. "Focus on anomalies and revenue trends". If omitted, the AI will summarise all ES|QL panels on the dashboard automatically.'
    ),
  grid: panelGridSchema,
});

export type AiDashboardSummaryPanelInput = z.infer<typeof aiDashboardSummaryPanelInputSchema>;
