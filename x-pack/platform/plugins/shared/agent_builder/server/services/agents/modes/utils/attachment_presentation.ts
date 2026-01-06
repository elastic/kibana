/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { isAttachmentActive, getLatestVersion } from '@kbn/agent-builder-common/attachments';

/**
 * Presentation mode for attachments in the LLM context.
 * - 'inline': Full content shown directly (for few attachments)
 * - 'summary': Only metadata shown, LLM must use tools to access content (for many attachments)
 */
export type AttachmentPresentationMode = 'inline' | 'summary';

/**
 * Result of preparing attachment presentation for the LLM.
 */
export interface AttachmentPresentation {
  /** The chosen presentation mode */
  mode: AttachmentPresentationMode;
  /** Formatted content to include in the LLM context */
  content: string;
  /** Number of active attachments */
  activeCount: number;
}

/**
 * Configuration for attachment presentation.
 */
export interface AttachmentPresentationConfig {
  /** Number of attachments at which to switch from inline to summary mode (default: 5) */
  threshold?: number;
  /** Maximum content length per attachment in inline mode before truncation (default: 10000) */
  maxContentLength?: number;
}

const DEFAULT_THRESHOLD = 5;
const DEFAULT_MAX_CONTENT_LENGTH = 10000;

/**
 * Prepares the attachment presentation for the LLM context.
 * Chooses between inline (full content) and summary (metadata only) modes
 * based on the number of active attachments.
 */
export const prepareAttachmentPresentation = (
  attachments: VersionedAttachment[],
  config?: AttachmentPresentationConfig
): AttachmentPresentation => {
  const threshold = config?.threshold ?? DEFAULT_THRESHOLD;
  const maxContentLength = config?.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH;

  const activeAttachments = attachments.filter(isAttachmentActive);
  const activeCount = activeAttachments.length;

  if (activeCount === 0) {
    return {
      mode: 'inline',
      content: '',
      activeCount: 0,
    };
  }

  if (activeCount <= threshold) {
    return {
      mode: 'inline',
      content: formatInlineAttachments(activeAttachments, maxContentLength),
      activeCount,
    };
  }

  return {
    mode: 'summary',
    content: formatSummaryAttachments(activeAttachments),
    activeCount,
  };
};

/**
 * Formats attachments for inline mode with full content.
 */
const formatInlineAttachments = (
  attachments: VersionedAttachment[],
  maxContentLength: number
): string => {
  const attachmentElements = attachments.map((attachment) => {
    const latest = getLatestVersion(attachment);
    if (!latest) {
      return '';
    }

    let contentStr = formatAttachmentContent(attachment, latest.data);

    // Truncate if too long
    if (contentStr.length > maxContentLength) {
      contentStr =
        contentStr.substring(0, maxContentLength) +
        '\n... [content truncated, use attachment_read for full content]';
    }

    const descAttr = attachment.description
      ? ` description="${escapeXml(attachment.description)}"`
      : '';

    return `  <attachment id="${attachment.id}" type="${attachment.type}" version="${latest.version}"${descAttr}>
${contentStr}
  </attachment>`;
  });

  return `<conversation-attachments count="${attachments.length}" mode="inline">
${attachmentElements.join('\n')}
</conversation-attachments>`;
};

/**
 * Formats attachments for summary mode with metadata only.
 */
const formatSummaryAttachments = (attachments: VersionedAttachment[]): string => {
  const attachmentElements = attachments.map((attachment) => {
    const latest = getLatestVersion(attachment);
    if (!latest) {
      return '';
    }

    const descAttr = attachment.description
      ? ` description="${escapeXml(attachment.description)}"`
      : '';
    const tokensAttr = latest.estimated_tokens
      ? ` estimated_tokens="${latest.estimated_tokens}"`
      : '';

    return `  <attachment id="${attachment.id}" type="${attachment.type}" version="${latest.version}"${tokensAttr}${descAttr} />`;
  });

  return `<conversation-attachments count="${attachments.length}" mode="summary">
  <note>Too many attachments to show inline. Use attachment_read(id) to access content.</note>
${attachmentElements.join('\n')}
</conversation-attachments>`;
};

/**
 * Formats attachment content based on type.
 * Special handling for visualization_ref to show reference info instead of full resolved content.
 */
const formatAttachmentContent = (attachment: VersionedAttachment, data: unknown): string => {
  if (typeof data === 'string') {
    return data;
  }
  return JSON.stringify(data, null, 2);
};

/**
 * Escapes special XML characters in a string.
 */
const escapeXml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Returns the system prompt for attachment handling based on presentation mode.
 */
export const getAttachmentSystemPrompt = (presentation: AttachmentPresentation): string => {
  if (presentation.activeCount === 0) {
    return '';
  }

  if (presentation.mode === 'inline') {
    return `## Conversation Attachments

The user has ${presentation.activeCount} attachment(s) in this conversation. The full content is shown above in XML format.

You can:
- Update attachments using attachment_update(id, data) to modify content
- Add new attachments using attachment_add(type, data) to store information

Since the content is shown inline, you don't need to read it - just reference it directly.`;
  }

  return `## Conversation Attachments

The user has ${presentation.activeCount} attachment(s) in this conversation. Only metadata is shown above due to the large number.

You MUST use attachment tools to access content:
- Read attachments using attachment_read(id) to see the content
- Update attachments using attachment_update(id, data) to modify content
- Add new attachments using attachment_add(type, data) to store information
- List all attachments using attachment_list() for an overview
- Compare versions using attachment_diff(id, from_version, to_version)

Always read an attachment before referencing its content in your response.`;
};
