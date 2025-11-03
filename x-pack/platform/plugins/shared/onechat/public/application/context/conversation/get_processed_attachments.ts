/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { AttachmentInput } from '@kbn/onechat-common/attachments';
import type { EmbeddableConversationProps } from '../../../embeddable/types';

/**
 * Processes attachments and returns only those that have changed or are new.
 * This function compares the current attachment content with previously sent content
 * to avoid re-sending unchanged attachments.
 *
 * @param attachments - The attachments to process
 * @param attachmentContentMapRef - Reference to the map tracking previously sent attachment content
 * @returns Promise resolving to an array of attachments that need to be sent
 */
export async function getProcessedAttachments(
  attachments: EmbeddableConversationProps['attachments'],
  attachmentContentMapRef: React.MutableRefObject<Map<string, Record<string, unknown>>>
): Promise<AttachmentInput[]> {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  const attachmentsToSend: AttachmentInput[] = [];

  for (const attachment of attachments) {
    try {
      const currentContent = await Promise.resolve(attachment.getContent());
      const previousContent = attachmentContentMapRef.current.get(attachment.id);

      const contentChanged = !isEqual(currentContent, previousContent);

      if (contentChanged || !previousContent) {
        attachmentsToSend.push({
          id: attachment.id,
          type: attachment.type,
          data: currentContent,
          hidden: true,
        });

        attachmentContentMapRef.current.set(attachment.id, currentContent);
      }
    } catch (attachmentError) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to fetch content for attachment ${attachment.id}:`, attachmentError);
    }
  }

  return attachmentsToSend;
}
