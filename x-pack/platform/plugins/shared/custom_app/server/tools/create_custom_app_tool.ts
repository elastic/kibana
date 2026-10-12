/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools/builtin';
import { getDocumentIssues } from '@kbn/custom-app-common';
import { createCustomContentTemplateResolver } from '@kbn/custom-content-server';
import {
  CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE,
  type CustomAppContextAttachmentData,
} from '../../common/app_context_attachment';
import { CUSTOM_APP_AUTHORING_GUIDE } from '../../common/authoring_guide';
import { customAppCreateSchema } from '../../common/create_app_schema';
import { resolveCustomContent } from './resolve_custom_content';
import { CREATE_CUSTOM_APP_TOOL_ID, UPDATE_CUSTOM_APP_TOOL_ID } from './update_custom_app_tool';

const error = (message: string) => ({
  results: [
    {
      tool_result_id: getToolResultId(),
      type: ToolResultType.error as const,
      data: { message },
    },
  ],
});

export const createCreateCustomAppTool = (): BuiltinToolDefinition<
  typeof customAppCreateSchema
> => ({
  id: CREATE_CUSTOM_APP_TOOL_ID,
  type: ToolType.builtin,
  annotations: {
    title: 'Create Custom App',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  tags: ['custom_app'],
  excludeFromMcp: true,
  description: `Create a new custom app: an interactive panel built from components, each driven by its own ES|QL query. Use it when the user asks for an app (filters, tables, details) and none is attached yet.

Pass the COMPLETE \`document\`. Check every ES|QL query and its fields with the tools you have before using it.

If the document has problems, this returns them one by one, each naming the component it is about. Fix every one and call the tool again.

On success this returns \`attachment_id\` and \`version\`. You MUST render the app inline as the last part of your response by emitting \`<render_attachment id="{attachment_id}" version="{version}" />\`. To change the app later, call ${UPDATE_CUSTOM_APP_TOOL_ID} with that \`attachment_id\`. To put it on a dashboard that is attached to this conversation, use the dashboard generation tool with \`source: "config"\`, \`type: "custom_app"\` and \`config: { title, document }\`, passing this document unchanged; if no dashboard is attached, tell the user to choose "Save to dashboard" on the app's card.

${CUSTOM_APP_AUTHORING_GUIDE}`,
  schema: customAppCreateSchema,
  handler: async (
    { title, document: requested },
    { attachments, logger, modelProvider, esClient }
  ) => {
    const resolved = await resolveCustomContent(
      requested,
      createCustomContentTemplateResolver({ modelProvider, esClient, logger })
    );
    if ('error' in resolved) return error(resolved.error);
    const { document } = resolved;

    const issues = getDocumentIssues(document);
    if (issues.length > 0) {
      return error(
        `The app has ${issues.length} problem${issues.length === 1 ? '' : 's'}. Fix ${
          issues.length === 1 ? 'it' : 'them all'
        } and call the tool again:\n${issues.map(({ message }) => `- ${message}`).join('\n')}`
      );
    }

    const data: CustomAppContextAttachmentData = {
      ...(title ? { panel_title: title } : {}),
      document,
    };

    try {
      const created = await attachments.add({
        type: CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE,
        data,
        description: title ? `Custom app: ${title}` : 'Custom app',
      });
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              message: 'The app was created. Render it inline as the last part of your response.',
              attachment_id: created.id,
              version: created.current_version,
            },
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`${CREATE_CUSTOM_APP_TOOL_ID}: could not save the app: ${message}`);
      return error(`The app could not be saved to the conversation: ${message}`);
    }
  },
});
