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
  CUSTOM_CONTENT_MAX_PROMPT_LENGTH,
  CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH,
  customContentStateSchema,
} from '@kbn/custom-content-common';
import { createCustomContentTemplateResolver } from '@kbn/custom-content-server';
import {
  CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  type CustomContentContextAttachmentData,
} from '../../common/panel_context_attachment';

const updateCustomContentSchema = customContentStateSchema
  .omit({ template: true })
  .extend({
    prompt: z
      .string()
      .min(1)
      .max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH)
      .optional()
      .describe(
        'Natural language instruction for what to create or change. The server generates the HTML template from this prompt, sampling the ES|QL schema only when the query is also changing.'
      ),
    esqlQuery: z
      .string()
      .max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH)
      .nullable()
      .optional()
      .describe(
        'New ES|QL query. Omit to keep the existing query. Pass null to remove the query entirely.'
      ),
  })
  .refine(({ prompt, esqlQuery }) => prompt !== undefined || esqlQuery !== undefined, {
    message: 'At least one of prompt or esqlQuery must be provided.',
  });

export const createUpdateCustomContentTool = (): BuiltinToolDefinition<
  typeof updateCustomContentSchema
> => ({
  id: 'custom_content_update_panel',
  type: ToolType.builtin,
  annotations: {
    title: 'Update Custom Content Panel',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  tags: ['custom_content'],
  description: `Update the custom content panel from a natural-language prompt and/or a new ES|QL query.

- Provide \`prompt\` to describe what to create or change. The server generates the HTML template.
- When \`esqlQuery\` is also changing, the server samples the new schema before generating so the template matches the data.
- When only \`prompt\` is provided (style or layout change, no query change), the server refines the existing template directly — no query sampling, preserving layout and design.
- Pass \`esqlQuery: null\` to remove the query entirely.`,
  schema: updateCustomContentSchema,
  handler: async ({ prompt, esqlQuery }, { attachments, logger, esClient, modelProvider }) => {
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

    const isQueryChanging = esqlQuery !== undefined;
    const resolvedQuery = esqlQuery === null ? undefined : esqlQuery ?? currentData?.esql_query;

    let resolvedTemplate: string = currentData?.panel_template ?? '';
    if (prompt !== undefined) {
      try {
        const resolver = createCustomContentTemplateResolver({ modelProvider, esClient, logger });
        resolvedTemplate = await resolver({
          prompt,
          esqlQuery: isQueryChanging ? resolvedQuery : undefined,
          existingTemplate: currentData?.panel_template || undefined,
          hasExistingQuery: !isQueryChanging && !!resolvedQuery,
        });
      } catch (err) {
        logger.error(`custom_content_update_panel: template resolver failed — ${err}`);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message: `Template generation failed: ${err.message}` },
            },
          ],
        };
      }
    }

    const newData: CustomContentContextAttachmentData = {
      panel_template: resolvedTemplate,
      esql_query: resolvedQuery,
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
