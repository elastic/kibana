/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { AttachmentInput } from '@kbn/onechat-common/attachments';
import type { UiAttachment } from '../../../embeddable/types';

/**
 * Processes attachments and returns only those that have changed or are new.
 * This function compares the current attachment content with previously sent content
 * to avoid re-sending unchanged attachments.
 *
 * @param params - Object containing:
 *   - attachments: The attachments to process
 *   - getAttachment: Function to retrieve previously sent attachment content by ID
 *   - setAttachment: Function to store attachment content by ID
 * @returns Promise resolving to an array of attachments that need to be sent
 */
export async function getProcessedAttachments({
  attachments,
  getAttachment,
  setAttachment,
}: {
  attachments: UiAttachment[];
  getAttachment: (id: string) => Record<string, unknown> | undefined;
  setAttachment: (id: string, content: Record<string, unknown>) => void;
}): Promise<AttachmentInput[]> {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  const attachmentsToSend: AttachmentInput[] = [];

  for (const attachment of attachments) {
    try {
      const currentContent = await Promise.resolve(attachment.getContent());
      const previousContent = getAttachment(attachment.id);

      const contentChanged = !isEqual(currentContent, previousContent);

      if (contentChanged || !previousContent) {
        attachmentsToSend.push({
          id: attachment.id,
          type: attachment.type,
          data: currentContent,
          hidden: true,
        });

        setAttachment(attachment.id, currentContent);
      }
    } catch (attachmentError) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to fetch content for attachment ${attachment.id}:`, attachmentError);
    }
  }

  return attachmentsToSend;
}
