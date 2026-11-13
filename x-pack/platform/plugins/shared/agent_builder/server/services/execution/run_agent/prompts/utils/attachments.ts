/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderAttachmentElement } from '@kbn/agent-builder-common/tools/custom_rendering';
import type { ProcessedAttachmentType } from '@kbn/agent-builder-server';

/**
 * Static, conversation-independent instructions for using the attachment tools.
 * Does not reference any specific attachment ids, types, or counts, so it is safe to
 * keep in the system prompt: its text never changes as attachments are added, read,
 * or updated during a conversation.
 */
export const attachmentToolsInstructions = (): string => {
  return `## ATTACHMENTS

The conversation may contain attachments. Only their metadata (id, type, version, description) is
ever shown inline — you MUST use the attachment tools to access content:
- Read attachments using attachments.read with {"attachment_id": "<id copied from the attachment metadata>"}. Omit attachment_id only when exactly one attachment is active.
- Update attachments using attachments.update with {"attachment_id": "<id>", "data": {}}.
- Add new attachments using attachments.add with {"type": "<type>", "data": {}}.
- List all attachments using attachments.list with {}.
- Compare versions using attachments.diff with {"attachment_id": "<id>", "from_version": 1, "to_version": 2}.

Always pass attachment_id when reading, updating, or comparing an attachment. Copy the id from the attachment metadata. When a new attachment
type first appears in the conversation, a description of that type follows immediately after it.`;
};

/**
 * Replaces the ATTACHMENTS section for agents whose `attachment_tools` capability is off, so the
 * agent knows it sees attachment metadata only and cannot read content.
 */
export const attachmentToolsUnavailableNotice = (): string => {
  return `## ATTACHMENTS

Attachments in this conversation are shown as metadata only (id, type, version). You have no tool to read their content. If a request depends on an attachment's content, say that you cannot open it.`;
};

export const attachmentTypeInstructions = (attachmentTypes: ProcessedAttachmentType[]): string => {
  if (attachmentTypes.length === 0) {
    return '';
  }

  const perTypeInstructions = attachmentTypes.map(({ type, description }) => {
    return `### ${type} attachments

${description ?? 'No instructions available.'}`;
  });

  return `## ATTACHMENT TYPES

  The current conversation contains attachments. Here is the list of attachment types present in the conversation and their corresponding description:

${perTypeInstructions.join('\n\n')}
  `;
};

export const renderAttachmentPrompt = () => {
  const { tagName, attributes } = renderAttachmentElement;

  return `### INLINE ATTACHMENT RENDERING
      You can render any attachment inline in the conversation by emitting a custom XML element:

      """
      <${tagName} ${attributes.attachmentId}="ATTACHMENT_ID" />
      """

      Each attachment type's description (shown inline the first time that type appears in the
      conversation) describes what that type looks like when rendered inline.
      When to render an attachment inline is determined by the task you are performing — refer to your skill or user instructions for guidance.

      **Rules**
      - You can specify an optional version by adding the \`${attributes.version}\` attribute. If not provided latest version will be used.
      - You must copy the \`attachment_id\` from the the attachment you want to render into \`${attributes.attachmentId}\` element attribute verbatim.
      - Do not invent, alter, or guess \`attachment_id\`. You must use the exact id of one of the existing attachments in the conversation.
      - You must not include any other attributes or content within the \`<${tagName}>\` element.

      **Example Usage:**

      Attachment has:
      {
        "attachment_id": "LiDoF1",
        "type": "...",
        "data": {
          ...
        }
      }

      To render this attachment inline your reply should contain:
      <${tagName} ${attributes.attachmentId}="LiDoF1"/>`;
};
