/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentsService } from '../../services/attachments/attachements_service';

interface UseAttachmentLifecycleParams {
  attachments: VersionedAttachment[] | undefined;
  conversationId: string | undefined;
  attachmentsService: AttachmentsService;
}

/**
 * Manages attachment lifecycle at the conversation level.
 * Tracks which attachments are present and calls onAttachmentMount/cleanup
 * when attachments are added to or removed from the conversation.
 */
export const useAttachmentLifecycle = ({
  attachments,
  conversationId,
  attachmentsService,
}: UseAttachmentLifecycleParams): void => {
  const cleanupFunctionsRef = useRef<Map<string, () => void>>(new Map());
  const previousAttachmentIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const currentAttachmentIds = new Set(attachments?.map((a) => a.id) ?? []);
    const previousAttachmentIds = previousAttachmentIdsRef.current;

    // Find new attachments (in current but not in previous)
    for (const attachment of attachments ?? []) {
      if (!previousAttachmentIds.has(attachment.id)) {
        const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);

        if (uiDefinition?.onAttachmentMount) {
          const cleanup = uiDefinition.onAttachmentMount({
            attachment: {
              id: attachment.id,
              type: attachment.type,
              data: attachment.versions[attachment.current_version - 1]?.data,
              origin: attachment.origin,
              hidden: attachment.hidden,
            },
            conversationId,
          });

          if (cleanup) {
            cleanupFunctionsRef.current.set(attachment.id, cleanup);
          }
        }
      }
    }

    // Find removed attachments (in previous but not in current)
    for (const attachmentId of previousAttachmentIds) {
      if (!currentAttachmentIds.has(attachmentId)) {
        const cleanup = cleanupFunctionsRef.current.get(attachmentId);
        if (cleanup) {
          cleanup();
          cleanupFunctionsRef.current.delete(attachmentId);
        }
      }
    }

    previousAttachmentIdsRef.current = currentAttachmentIds;
  }, [attachments, conversationId, attachmentsService]);

  // Cleanup all on unmount
  useEffect(() => {
    const cleanupFunctions = cleanupFunctionsRef.current;
    return () => {
      for (const cleanup of cleanupFunctions.values()) {
        cleanup();
      }
      cleanupFunctions.clear();
    };
  }, []);
};
