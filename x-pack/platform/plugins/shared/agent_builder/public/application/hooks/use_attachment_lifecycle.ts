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
  invalidateConversation: () => void;
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
  invalidateConversation,
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
          const attachmentId = attachment.id;
          const cleanup = uiDefinition.onAttachmentMount({
            getAttachment: () => {
              const current = attachments?.find((a) => a.id === attachmentId);
              if (!current) {
                throw new Error(`Attachment ${attachmentId} not found`);
              }
              return {
                id: current.id,
                type: current.type,
                data: current.versions[current.current_version - 1]?.data,
                origin: current.origin,
                hidden: current.hidden,
              };
            },
            updateOrigin: async (origin: string) => {
              const result = await attachmentsService.updateOrigin(
                conversationId,
                attachmentId,
                origin
              );
              invalidateConversation();
              return result;
            },
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
  }, [attachments, conversationId, attachmentsService, invalidateConversation]);

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
