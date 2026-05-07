/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { panelGridSchema } from '@kbn/dashboard-agent-common';
import { z } from '@kbn/zod/v4';

const nonEmptyString = z.string().refine((value) => value.trim().length > 0, {
  message: 'Value must be a non-empty string.',
});

const panelGridInputSchema = panelGridSchema.describe(
  'Panel layout in grid units. w: width (1-48), h: height, x: column (0-47), y: row. The dashboard is 48 columns wide. Always set x and y to place panels without gaps.'
);

const basePanelSourceSchema = z.object({
  grid: panelGridInputSchema,
});

const markdownPanelSourceSchema = basePanelSourceSchema.extend({
  source: z.literal('markdown'),
  content: nonEmptyString.describe('Markdown content for the panel.'),
});

const attachmentPanelSourceSchema = basePanelSourceSchema.extend({
  source: z.literal('attachment'),
  attachmentId: nonEmptyString.describe('Visualization attachment ID to add as a dashboard panel.'),
});

const inlineVisualizationPanelSourceSchema = basePanelSourceSchema.extend({
  source: z.literal('inline_visualization'),
  query: nonEmptyString.describe('A natural language query describing the desired visualization.'),
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
});

const sectionIdSchema = z
  .string()
  .optional()
  .describe(
    'ID of an existing section to add this panel into. The section must already exist (use add_section first). If omitted, panel is added at the top level.'
  );

export const sectionPanelInputSchema = z.discriminatedUnion('source', [
  markdownPanelSourceSchema,
  attachmentPanelSourceSchema,
  inlineVisualizationPanelSourceSchema,
]);

export const addPanelInputSchema = z.discriminatedUnion('source', [
  markdownPanelSourceSchema.extend({ sectionId: sectionIdSchema }),
  attachmentPanelSourceSchema.extend({ sectionId: sectionIdSchema }),
  inlineVisualizationPanelSourceSchema.extend({ sectionId: sectionIdSchema }),
]);

export type SectionPanelInput = z.infer<typeof sectionPanelInputSchema>;
export type AddPanelInput = z.infer<typeof addPanelInputSchema>;
export type InlineVisualizationSectionPanelInput = Extract<
  SectionPanelInput,
  { source: 'inline_visualization' }
>;
export type InlineVisualizationAddPanelInput = Extract<
  AddPanelInput,
  { source: 'inline_visualization' }
>;

export const getPanelInputIdentifier = (panelInput: AddPanelInput | SectionPanelInput): string => {
  switch (panelInput.source) {
    case 'attachment':
      return panelInput.attachmentId;
    case 'inline_visualization':
      return panelInput.query;
    case 'markdown':
      return panelInput.content.slice(0, 80);
  }
};
