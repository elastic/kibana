/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/onechat-common/chat';

/**
 * Rebuilds the attachment content map from conversation history.
 * This ensures that attachments are not resent unnecessarily by tracking
 * what attachment content has already been sent in previous messages.
 *
 * @param conversation - The conversation containing message history
 * @returns A Map of attachment IDs to their content
 */
export function rebuildAttachmentMapFromConversation(
  conversation: Conversation | undefined
): Map<string, Record<string, unknown>> {
  const rebuiltMap = new Map<string, Record<string, unknown>>();

  if (!conversation?.rounds || conversation.rounds.length === 0) {
    return rebuiltMap;
  }

  conversation.rounds.forEach((round) => {
    if (round.input.attachments && Array.isArray(round.input.attachments)) {
      round.input.attachments.forEach((attachment) => {
        if (attachment.id && attachment.data) {
          rebuiltMap.set(attachment.id, attachment.data);
        }
      });
    }
  });

  return rebuiltMap;
}
