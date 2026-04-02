/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderAttachmentElement } from '@kbn/agent-builder-common/tools/custom_rendering';
import type { ProcessedAttachmentType } from '../../../utils/prepare_conversation';

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

      The "ATTACHMENT TYPES" section describes what each type looks like when rendered inline.
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
