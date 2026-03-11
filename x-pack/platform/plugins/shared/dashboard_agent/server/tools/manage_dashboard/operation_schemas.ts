/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { panelGridSchema, sectionGridSchema } from '@kbn/dashboard-agent-common';

export const setMetadataOperationSchema = z.object({
  operation: z.literal('set_metadata'),
  title: z.string().optional(),
  description: z.string().optional(),
});

export const upsertMarkdownOperationSchema = z.object({
  operation: z.literal('upsert_markdown'),
  markdownContent: z.string().describe('Markdown content for the dashboard summary panel.'),
});

const attachmentWithGridSchema = z.object({
  attachmentId: z.string().describe('Visualization attachment ID to add as a dashboard panel.'),
  grid: panelGridSchema.describe(
    'Panel layout in grid units. w: width (1–48), h: height, x: column (0–47), y: row. The dashboard is 48 columns wide. Always set x and y to place panels without gaps.'
  ),
});

const addSectionGridSchema = sectionGridSchema.describe(
  'Section position in outer dashboard grid coordinates.'
);

const controlTypeSchema = z.enum(['optionsListControl', 'rangeSliderControl']);
const controlWidthSchema = z.enum(['small', 'medium', 'large']);

export const manageControlInputSchema = z.object({
  type: controlTypeSchema,
  fieldName: z.string().describe('Field name used by the control.'),
  indexPattern: z
    .string()
    .describe('Data view title/index pattern (for example "logs-*") used to resolve data view id.'),
  title: z.string().optional().describe('Optional control title.'),
  width: controlWidthSchema.optional(),
  grow: z.boolean().optional(),
});

export const addPanelsFromAttachmentsOperationSchema = z.object({
  operation: z.literal('add_panels_from_attachments'),
  items: z
    .array(
      attachmentWithGridSchema.extend({
        sectionId: z
          .string()
          .optional()
          .describe(
            'Optional section ID to add this panel into. If omitted, panel is added at the top level.'
          ),
      })
    )
    .min(1)
    .describe('Visualization attachments to add, each with its dashboard grid layout.'),
});

export const addSectionOperationSchema = z.object({
  operation: z.literal('add_section'),
  title: z.string().describe('Section title.'),
  grid: addSectionGridSchema,
  panels: z
    .array(attachmentWithGridSchema)
    .describe('Panels to create inside the section. Coordinates are section-relative.'),
});

export const removeSectionOperationSchema = z.object({
  operation: z.literal('remove_section'),
  sectionId: z.string().describe('Section id to remove.'),
  panelAction: z
    .enum(['promote', 'delete'])
    .describe('How to handle section panels: promote to top-level or delete them.'),
});

export const removePanelsOperationSchema = z.object({
  operation: z.literal('remove_panels'),
  panelIds: z.array(z.string()).min(1).describe('Panel ids to remove from the dashboard.'),
});

export const addControlsOperationSchema = z.object({
  operation: z.literal('add_controls'),
  items: z
    .array(manageControlInputSchema)
    .min(1)
    .describe('Controls to append to pinned controls.'),
});

export const removeControlsOperationSchema = z.object({
  operation: z.literal('remove_controls'),
  controlIds: z.array(z.string()).min(1).describe('Control uid values to remove.'),
});

export const dashboardOperationSchema = z.discriminatedUnion('operation', [
  setMetadataOperationSchema,
  upsertMarkdownOperationSchema,
  addPanelsFromAttachmentsOperationSchema,
  addSectionOperationSchema,
  removeSectionOperationSchema,
  removePanelsOperationSchema,
  addControlsOperationSchema,
  removeControlsOperationSchema,
]);

export type DashboardOperation = z.infer<typeof dashboardOperationSchema>;
export type ManageControlInput = z.infer<typeof manageControlInputSchema>;
