/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import { ATTACHMENT_REF_ACTOR, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools/builtin';
import {
  CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  type CustomContentContextAttachmentData,
} from '../../common/panel_context_attachment';
import { CUSTOM_CONTENT_SCRIPT_PATTERN } from '../../common/constants';

const updateCustomContentSchema = z.object({
  template: z
    .string()
    .max(100_000)
    .optional()
    .describe('New HTML template (LiquidJS, no JavaScript). Replaces the current template.'),
  esqlQuery: z
    .string()
    .max(10_000)
    .nullable()
    .optional()
    .describe(
      'New ES|QL query. Omit to keep the existing query. Pass null to remove the query entirely.'
    ),
});

export const createUpdateCustomContentTool = (): BuiltinToolDefinition<
  typeof updateCustomContentSchema
> => ({
  id: 'custom_content_update_panel',
  type: ToolType.builtin,
  tags: ['custom_content'],
  description:
    'Update the custom content panel. Set `template` to modify the HTML/CSS (LiquidJS, no JavaScript allowed). Set `esqlQuery` to change the data source. Set both to change both at once. Returns an error if the template contains script tags.',
  schema: updateCustomContentSchema,
  handler: async ({ template, esqlQuery }, { attachments, logger }) => {
    if (template !== undefined && CUSTOM_CONTENT_SCRIPT_PATTERN.test(template)) {
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: {
              message:
                'Template was rejected: JavaScript (<script> tags) is not allowed in custom content panels. Use LiquidJS syntax for dynamic content.',
            },
          },
        ],
      };
    }

    const allAttachments = attachments.getAll();
    const contextAttachment = allAttachments.find(
      (a) => a.type === CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE
    );

    if (!contextAttachment) {
      logger.warn('custom_content_update_panel: no custom_content_context attachment found');
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: { message: 'No custom content panel context found in this conversation.' },
          },
        ],
      };
    }

    const currentData = getLatestVersion(contextAttachment)?.data as
      | CustomContentContextAttachmentData
      | undefined;

    const newData: CustomContentContextAttachmentData = {
      panel_template: template ?? currentData?.panel_template ?? '',
      esql_query: esqlQuery === null ? undefined : esqlQuery ?? currentData?.esql_query,
      panel_title: currentData?.panel_title,
      embeddable_id: currentData?.embeddable_id ?? '',
    };

    await attachments.update(contextAttachment.id, { data: newData }, ATTACHMENT_REF_ACTOR.agent);

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: { message: 'Panel updated successfully.' },
        },
      ],
    };
  },
});
