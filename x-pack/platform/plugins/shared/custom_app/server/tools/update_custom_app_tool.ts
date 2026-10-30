/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools/builtin';
import { getDocumentIssues } from '@kbn/custom-app-common';
import { createCustomContentTemplateResolver } from '@kbn/custom-content-server';
import {
  CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE,
  type CustomAppContextAttachmentData,
} from '../../common/app_context_attachment';
import { CUSTOM_APP_AUTHORING_GUIDE } from '../../common/authoring_guide';
import { readAppContextData } from '../../common/read_app_context_data';
import { customAppUpdateSchema } from '../../common/update_app_schema';
import {
  CUSTOM_APP_UPDATED_UI_EVENT,
  type CustomAppUpdatedUiEventData,
} from '../../common/ui_events';
import { resolveCustomContent } from './resolve_custom_content';

export const UPDATE_CUSTOM_APP_TOOL_ID = 'custom_app_update_app';
export const CREATE_CUSTOM_APP_TOOL_ID = 'custom_app_create_app';

const error = (message: string) => ({
  results: [
    {
      tool_result_id: getToolResultId(),
      type: ToolResultType.error as const,
      data: { message },
    },
  ],
});

export const createUpdateCustomAppTool = (): BuiltinToolDefinition<
  typeof customAppUpdateSchema
> => ({
  id: UPDATE_CUSTOM_APP_TOOL_ID,
  type: ToolType.builtin,
  annotations: {
    title: 'Update Custom App',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  tags: ['custom_app'],
  excludeFromMcp: true,
  description: `Change a custom app: an interactive panel built from components, each driven by its own ES|QL query.

Pass the \`embeddable_id\` of the app (or, for an app created in this conversation, its \`attachment_id\`) and the COMPLETE \`document\` as it should be after the change. Start from the current document in the app's context and change only what was asked; do not drop components or values the user did not mention. Check ES|QL queries with the tools you have before using them.

If the document has problems, this returns them one by one, each naming the component it is about. Fix every one and call the tool again.

This tool only reaches apps attached to the conversation: apps the user sent from an editor with "Generate with chat", and apps created here with ${CREATE_CUSTOM_APP_TOOL_ID}.

On success this returns \`attachment_id\` and \`version\`. You MUST render the updated app inline as the last part of your response by emitting \`<render_attachment id="{attachment_id}" version="{version}" />\`.

${CUSTOM_APP_AUTHORING_GUIDE}`,
  schema: customAppUpdateSchema,
  handler: async (
    { embeddable_id: embeddableId, attachment_id: attachmentId, document: requested },
    { attachments, events, logger, modelProvider, esClient }
  ) => {
    if (!embeddableId && !attachmentId) {
      return error('Pass either the embeddable_id or the attachment_id of the app to change.');
    }

    const appAttachments = attachments
      .getAll()
      .filter((attachment) => attachment.type === CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE);
    const contextAttachment = appAttachments.find((attachment) =>
      attachmentId
        ? attachment.id === attachmentId
        : readAppContextData(attachment)?.embeddable_id === embeddableId
    );

    if (!contextAttachment) {
      logger.warn(
        `${UPDATE_CUSTOM_APP_TOOL_ID}: no app attached for "${attachmentId ?? embeddableId}"`
      );
      const attached = appAttachments.flatMap((attachment) => {
        const data = readAppContextData(attachment);
        return data ? [data.embeddable_id ?? attachment.id] : [];
      });
      return error(
        attached.length > 0
          ? `No custom app "${
              attachmentId ?? embeddableId
            }" is attached to this conversation. Attached apps: ${attached.join(', ')}.`
          : `No custom app is attached to this conversation. To make a new one, use ${CREATE_CUSTOM_APP_TOOL_ID}; to change one on a dashboard, ask the user to open its editor and choose "Generate with chat".`
      );
    }

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

    const current = readAppContextData(contextAttachment);
    const data: CustomAppContextAttachmentData = {
      ...(current?.embeddable_id ? { embeddable_id: current.embeddable_id } : {}),
      ...(current?.panel_title ? { panel_title: current.panel_title } : {}),
      document,
    };

    const updated = await attachments.update(
      contextAttachment.id,
      { data },
      ATTACHMENT_REF_ACTOR.agent
    );

    if (updated) {
      events.sendUiEvent<typeof CUSTOM_APP_UPDATED_UI_EVENT, CustomAppUpdatedUiEventData>(
        CUSTOM_APP_UPDATED_UI_EVENT,
        { attachmentId: contextAttachment.id, data }
      );
    }

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            message: updated
              ? 'The app was updated. Render it inline as the last part of your response.'
              : 'The app could not be saved to the conversation.',
            attachment_id: contextAttachment.id,
            version: updated?.current_version,
          },
        },
      ],
    };
  },
});
