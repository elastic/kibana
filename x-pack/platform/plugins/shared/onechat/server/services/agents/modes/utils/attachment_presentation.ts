/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/onechat-common/attachments';
import {
  getLatestVersion,
  isAttachmentActive,
  AttachmentType,
  type VisualizationRefAttachmentData,
} from '@kbn/onechat-common/attachments';
import { inlineModeAttachmentToolIds, summaryModeAttachmentToolIds } from '../../../tools/builtin';

/**
 * Default threshold for switching from inline to summary mode.
 * Below this count, attachments are shown inline with full content.
 * Above this count, attachments are summarized to save token context.
 */
const DEFAULT_INLINE_THRESHOLD = 5;

/**
 * Presentation modes for conversation attachments.
 * - 'inline': Full content is shown directly in the context
 * - 'summary': Only metadata is shown, use attachment_read tool for content
 */
export type AttachmentPresentationMode = 'inline' | 'summary';

/**
 * Result of preparing attachment presentation for the LLM.
 */
export interface AttachmentPresentation {
  /** The presentation mode chosen based on attachment count */
  mode: AttachmentPresentationMode;
  /** Formatted content to add to the LLM context */
  content: string;
  /** Tool IDs that should be exposed based on presentation mode */
  tools: string[];
}

/**
 * Configuration options for attachment presentation.
 */
export interface AttachmentPresentationConfig {
  /** Threshold for switching from inline to summary mode */
  threshold?: number;
}

/**
 * Prepares the attachment presentation for the LLM context.
 * Decides between inline (full content) and summary (metadata only) modes
 * based on the number of active attachments.
 *
 * @param attachments - Array of versioned attachments
 * @param config - Optional configuration for presentation
 * @returns Presentation result with mode, content, and tool recommendations
 */
export const prepareAttachmentPresentation = (
  attachments: VersionedAttachment[],
  config?: AttachmentPresentationConfig
): AttachmentPresentation => {
  const threshold = config?.threshold ?? DEFAULT_INLINE_THRESHOLD;

  // Filter to only active (non-deleted) attachments
  const activeAttachments = attachments.filter(isAttachmentActive);

  if (activeAttachments.length === 0) {
    return {
      mode: 'inline',
      content: '',
      tools: [],
    };
  }

  if (activeAttachments.length <= threshold) {
    return {
      mode: 'inline',
      content: formatInlineAttachments(activeAttachments),
      tools: inlineModeAttachmentToolIds,
    };
  }

  return {
    mode: 'summary',
    content: formatAttachmentSummaries(activeAttachments),
    tools: summaryModeAttachmentToolIds,
  };
};

/**
 * Formats attachments for inline presentation (full content shown).
 * Used when attachment count is below the threshold.
 */
const formatInlineAttachments = (attachments: VersionedAttachment[]): string => {
  const attachmentLines = attachments
    .map((attachment) => {
      const latest = getLatestVersion(attachment);
      if (!latest) return '';

      // Format content based on type, with reasonable truncation for large content
      let contentStr: string;
      try {
        // Special handling for visualization_ref - don't include resolved_content in inline view
        // The resolved_content is only for internal versioning, not for the LLM
        if (attachment.type === AttachmentType.visualizationRef) {
          const refData = latest.data as VisualizationRefAttachmentData;
          // Show reference info without the full resolved content
          const refInfo = {
            saved_object_id: refData.saved_object_id,
            saved_object_type: refData.saved_object_type,
            title: refData.title,
            description: refData.description,
            last_resolved_at: refData.last_resolved_at,
            // Indicate whether content is available
            has_content: !!refData.resolved_content,
          };
          contentStr = JSON.stringify(refInfo, null, 2);
          contentStr += '\n[Use attachment_read to get the full visualization content]';
        } else {
          contentStr =
            typeof latest.data === 'string' ? latest.data : JSON.stringify(latest.data, null, 2);

          // Truncate very large content to prevent context overflow
          const maxContentLength = 10000;
          if (contentStr.length > maxContentLength) {
            contentStr =
              contentStr.substring(0, maxContentLength) +
              '\n... [content truncated, use attachment_read for full content]';
          }
        }
      } catch {
        contentStr = '[Unable to serialize content]';
      }

      const descriptionAttr = attachment.description
        ? ` description="${attachment.description}"`
        : '';

      return `  <attachment id="${attachment.id}" type="${attachment.type}" version="${attachment.current_version}"${descriptionAttr}>
${contentStr}
  </attachment>`;
    })
    .filter(Boolean);

  return `<conversation-attachments count="${attachments.length}" mode="inline">
${attachmentLines.join('\n')}
</conversation-attachments>`;
};

/**
 * Formats attachments as summaries (metadata only).
 * Used when attachment count exceeds the threshold.
 */
const formatAttachmentSummaries = (attachments: VersionedAttachment[]): string => {
  const summaryLines = attachments.map((attachment) => {
    const latest = getLatestVersion(attachment);
    const tokensAttr = latest?.estimated_tokens
      ? ` estimated_tokens="${latest.estimated_tokens}"`
      : '';
    const descAttr = attachment.description ? ` description="${attachment.description}"` : '';

    return `  <attachment id="${attachment.id}" type="${attachment.type}" version="${attachment.current_version}"${tokensAttr}${descAttr} />`;
  });

  return `<conversation-attachments count="${attachments.length}" mode="summary">
  <note>Too many attachments to show inline. Use attachment_read(id) to access full content, or attachment_list() to see all attachments.</note>
${summaryLines.join('\n')}
</conversation-attachments>`;
};

/**
 * Generates a system prompt addition explaining the attachment tools and context.
 *
 * @param mode - The current presentation mode
 * @returns System prompt text to add
 */
export const getAttachmentSystemPrompt = (mode: AttachmentPresentationMode): string => {
  if (mode === 'inline') {
    return `
## Conversation Attachments

This conversation has attachments that provide additional context. The full content of each attachment is shown inline above.

Available attachment tools:
- attachment_update: Update an attachment with new content (creates a new version)
- attachment_add: Add a new attachment to the conversation
- attachment_delete: Remove an attachment (soft-delete, can be restored)

When referencing attachment content, you can cite the attachment ID and version.
`;
  }

  return `
## Conversation Attachments

This conversation has multiple attachments. Due to context limits, only summaries are shown above.

Available attachment tools:
- attachment_read: Read the full content of an attachment
- attachment_update: Update an attachment with new content (creates a new version)
- attachment_add: Add a new attachment to the conversation
- attachment_delete: Remove an attachment (soft-delete, can be restored)
- attachment_list: List all attachments with their metadata
- attachment_diff: See what changed between attachment versions

Use attachment_read(attachment_id) to access the full content when needed.
`;
};
