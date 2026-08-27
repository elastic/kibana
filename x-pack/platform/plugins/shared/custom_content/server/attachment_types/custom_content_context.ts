/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  customContentContextAttachmentDataSchema,
  type CustomContentContextAttachmentData,
} from '../../common/panel_context_attachment';

const formatPanelContext = (data: CustomContentContextAttachmentData): string => {
  const parts = [`Custom content panel (embeddable_id: ${data.embeddable_id}):`];

  if (data.esql_query) {
    parts.push(`\nES|QL Query:\n\`\`\`esql\n${data.esql_query}\n\`\`\``);
  }

  const templateDisplay = data.panel_template
    ? `\`\`\`html\n${data.panel_template}\n\`\`\``
    : '(empty — no template generated yet)';
  parts.push(`\nHTML Template:\n${templateDisplay}`);

  return parts.join('');
};

export const createCustomContentContextAttachmentType = (): AttachmentTypeDefinition<
  typeof CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  CustomContentContextAttachmentData
> => ({
  id: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  isReadonly: true,
  validate: (input) => {
    const result = customContentContextAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: formatPanelContext(attachment.data),
    }),
  }),
  getAgentDescription: () =>
    'A custom content panel context containing the current HTML template and optional ES|QL query. Each panel shows its embeddable_id in its context header. Use the custom_content_update_panel tool to propose refined templates or query changes, passing the embeddable_id of the panel you are updating — this is required to target the correct panel when multiple panels are in the conversation. After every successful update, render the attachment inline as the last part of your response with `<render_attachment id="{attachment_id}" version="{version}" />`, using the ids returned by the tool — this is what gives the user the preview and version history for the panel.',
  getTools: () => ['custom_content_update_panel'],
});
