/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { z } from '@kbn/zod/v4';

export const markdownPanelInputSchema = z.object({
  kind: z.literal('markdown'),
  markdownContent: z.string().describe('Markdown content for the panel.'),
  grid: panelGridSchema,
});

export const panelConfigPanelInputSchema = z.object({
  kind: z.literal('panelConfig'),
  type: z
    .string()
    .describe(
      `Embeddable type for the panel (e.g. the ${LENS_EMBEDDABLE_TYPE} embeddable type for a visualization).`
    ),
  config: z
    .record(z.string(), z.unknown())
    .describe(
      'Already-resolved panel configuration. Supply the config of an existing visualization (e.g. read from a visualization attachment) rather than an attachment ID. The generation tool does not read any attachment store.'
    ),
  grid: panelGridSchema,
});

export type PanelConfigPanelInput = z.infer<typeof panelConfigPanelInputSchema>;

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
