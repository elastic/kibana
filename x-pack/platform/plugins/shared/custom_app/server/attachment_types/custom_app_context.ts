/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE,
  customAppContextAttachmentDataSchema,
  type CustomAppContextAttachmentData,
} from '../../common/app_context_attachment';
import { CUSTOM_APP_AUTHORING_GUIDE } from '../../common/authoring_guide';
import { UPDATE_CUSTOM_APP_TOOL_ID } from '../tools/update_custom_app_tool';

const formatAppContext = (
  attachmentId: string,
  { embeddable_id: embeddableId, panel_title: panelTitle, document }: CustomAppContextAttachmentData
): string =>
  [
    // The ids are in the text on purpose, so the agent can pass them back to the tool.
    `Custom app${panelTitle ? ` "${panelTitle}"` : ''} (${
      embeddableId ? `embeddable_id: ${embeddableId}` : `attachment_id: ${attachmentId}`
    }):`,
    '```json',
    JSON.stringify(document, null, 2),
    '```',
  ].join('\n');

export const createCustomAppContextAttachmentType = (): AttachmentTypeDefinition<
  typeof CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE,
  CustomAppContextAttachmentData
> => ({
  id: CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE,
  isReadonly: true,
  // An app is bounded by its schema, but can still be long; cutting it off would hand the agent a
  // document that is not valid JSON to edit.
  maxContentLength: 250_000,
  validate: (input) => {
    const result = customAppContextAttachmentDataSchema.safeParse(input);
    return result.success
      ? { valid: true, data: result.data }
      : { valid: false, error: result.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: formatAppContext(attachment.id, attachment.data),
    }),
  }),
  getAgentDescription: () =>
    `A custom app: an interactive panel built from components, each driven by its own ES|QL query. Each app shows its embeddable_id (or attachment_id, for an app created in this conversation) in its context header. Use the ${UPDATE_CUSTOM_APP_TOOL_ID} tool to change an app, passing that id and the COMPLETE app as it should be: start from the current document and change only what was asked. If the tool reports problems, fix them and call it again. To put an app on a dashboard that is attached to this conversation, use the dashboard generation tool with \`source: "config"\`, \`type: "custom_app"\` and \`config: { title, document }\`, passing the app's document unchanged; if no dashboard is attached, tell the user to use "Save to dashboard" on the app's card. After every successful update, render the attachment inline as the last part of your response with \`<render_attachment id="{attachment_id}" version="{version}" />\`, using the ids returned by the tool.

${CUSTOM_APP_AUTHORING_GUIDE}`,
  getTools: () => [UPDATE_CUSTOM_APP_TOOL_ID],
});
