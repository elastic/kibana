/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { isAttachmentActive, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { generateXmlTree, type XmlNode } from '@kbn/agent-builder-genai-utils/tools/utils';
import type { BaseMessageLike } from '@langchain/core/messages';

/**
 * Result of preparing attachment presentation for the LLM.
 * Attachments are always presented in summary mode: only metadata is shown,
 * and the LLM must use attachment tools (attachment_read, attachment_list, ...)
 * to access content.
 */
export interface AttachmentPresentation {
  /** Formatted content to include in the LLM context */
  content: string;
  /** Number of active attachments */
  activeCount: number;
}

/**
 * Prepares the attachment presentation for the LLM context.
 * Attachments are always presented in summary mode (metadata only); the LLM
 * must use attachment tools to access content.
 */
export const prepareAttachmentPresentation = async (
  attachments: VersionedAttachment[]
): Promise<AttachmentPresentation> => {
  const activeAttachments = attachments.filter(isAttachmentActive);
  const activeCount = activeAttachments.length;

  if (activeCount === 0) {
    return {
      content: '',
      activeCount: 0,
    };
  }

  return {
    content: formatSummaryAttachments(activeAttachments),
    activeCount,
  };
};

/**
 * Formats attachments for summary mode with metadata only.
 */
const formatSummaryAttachments = (attachments: VersionedAttachment[]): string => {
  const attachmentElements: XmlNode[] = attachments.flatMap((attachment) => {
    const latest = getLatestVersion(attachment);
    if (!latest) {
      return [];
    }

    return [
      {
        tagName: 'attachment',
        attributes: {
          attachment_id: attachment.id,
          type: attachment.type,
          version: latest.version,
          estimated_tokens: latest.estimated_tokens,
          description: attachment.description,
        },
      } satisfies XmlNode,
    ];
  });

  return generateXmlTree(
    {
      tagName: 'conversation-attachments',
      attributes: { count: attachments.length },
      children: [
        {
          tagName: 'note',
          children: ['Use attachment_read(attachment_id) to access content.'],
        },
        ...attachmentElements,
      ],
    },
    { escapeContent: false }
  );
};

/**
 * Returns the conversation attachments prompt section (title, XML content, and handling instructions).
 * Returns an empty string when there are no active attachments.
 */
export const getConversationAttachmentsSection = (
  presentation?: AttachmentPresentation
): string => {
  if (!presentation || presentation.activeCount <= 0) {
    return '';
  }

  const preamble = `## Conversation Attachments\n\nThe user has ${presentation.activeCount} attachment(s) in this conversation. Only metadata is shown below.`;

  const instructions = `You MUST use attachment tools to access content:
- Read attachments using attachment_read(attachment_id) to see the content
- Update attachments using attachment_update(id, data) to modify content
- Add new attachments using attachment_add(type, data) to store information
- List all attachments using attachment_list() for an overview
- Compare versions using attachment_diff(id, from_version, to_version)

Always read an attachment before referencing its content in your response.`;

  return `${preamble}\n\n${presentation.content}\n\n${instructions}`;
};

/**
 * Builds the system message(s) used to expose conversation-level attachments to the LLM
 * (attachment XML + handling instructions).
 */
export const getConversationAttachmentsSystemMessages = (
  presentation?: AttachmentPresentation
): BaseMessageLike[] => {
  const section = getConversationAttachmentsSection(presentation);
  if (!section) {
    return [];
  }
  return [['system', section] as const];
};
