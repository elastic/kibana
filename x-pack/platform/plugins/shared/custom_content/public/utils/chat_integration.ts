/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import {
  CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  type CustomContentContextAttachmentData,
} from '../../common/panel_context_attachment';

export const buildCustomContentContextAttachment = (
  template: string,
  esqlQuery: string | undefined,
  panelTitle?: string
): AttachmentInput<
  typeof CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  CustomContentContextAttachmentData
> => ({
  type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  data: { panel_template: template, esql_query: esqlQuery, panel_title: panelTitle },
});

const updateCustomContentConfigSchema = z.object({
  template: z
    .string()
    .optional()
    .describe('New HTML template (LiquidJS, no JavaScript). Replaces the current template.'),
  esqlQuery: z
    .string()
    .optional()
    .describe(
      'New ES|QL query. If a template is already set, the existing template will be re-rendered with data from the new query.'
    ),
});

export type UpdateCustomContentConfigParams = z.infer<typeof updateCustomContentConfigSchema>;

export const createUpdateCustomContentConfigTool = (
  onUpdate: (params: UpdateCustomContentConfigParams) => void
): BrowserApiToolDefinition<UpdateCustomContentConfigParams> => ({
  id: 'custom_content_update_panel',
  description:
    'Update the custom content panel. Set `template` to modify the HTML/CSS. Set `esqlQuery` to change the data source. Set both to change both at once.',
  schema: updateCustomContentConfigSchema,
  handler: onUpdate,
});
