/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { AttachmentInput, VersionedAttachment } from '@kbn/onechat-common/attachments';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useOnechatServices } from './use_onechat_service';
import { useConversationAttachments } from './use_conversation';
import { queryKeys } from '../query_keys';

/**
 * Hook that synchronizes flyout-provided attachments to conversation-level attachments.
 *
 * When attachments are provided via setActiveFlyoutConfiguration, this hook:
 * 1. Automatically creates/updates them as conversation-level attachments when a conversation exists
 * 2. Works with both existing and newly created conversations
 * 3. Syncs attachments when a new conversation is created (e.g., after "New Chat")
 * 4. Persists attachments across "New Chat" - they will be synced to each new conversation
 * 5. Updates existing attachments if they have the same ID (instead of creating duplicates)
 *
 * IMPORTANT: Attachments provided via setActiveFlyoutConfiguration should have unique IDs
 * to enable proper update behavior when the flyout reopens.
 */
export function useSyncFlyoutAttachments() {
  const conversationId = useConversationId();
  const { attachments: flyoutAttachments, resetAttachments } = useConversationContext();
  const { conversationsService } = useOnechatServices();
  const queryClient = useQueryClient();
  const existingAttachments = useConversationAttachments();

  // Store the original flyout attachments - these persist across "New Chat" operations
  const originalAttachmentsRef = useRef<AttachmentInput[]>([]);
  // Track which attachment IDs have been synced for the current conversation
  const syncedAttachmentIdsRef = useRef<Map<string, Set<string>>>(new Map());
  const isSyncingRef = useRef(false);

  // Capture original attachments when they first arrive
  // Only capture if we haven't captured any yet (to preserve across New Chat)
  useEffect(() => {
    if (flyoutAttachments?.length && originalAttachmentsRef.current.length === 0) {
      originalAttachmentsRef.current = [...flyoutAttachments];
    }
  }, [flyoutAttachments]);

  // Find existing attachment by ID
  const findExistingAttachment = useCallback(
    (attachmentId: string): VersionedAttachment | undefined => {
      return existingAttachments?.find((att) => att.id === attachmentId);
    },
    [existingAttachments]
  );

  // Sync a single attachment to the conversation (create or update)
  const syncAttachment = useCallback(
    async (attachment: AttachmentInput, targetConversationId: string) => {
      try {
        // Resolve content if it's a lazy loader
        let data = attachment.data;
        if (typeof data === 'function') {
          data = await data();
        }

        // Skip if content is empty/null
        if (data === null || data === undefined) {
          return false;
        }

        // Check if attachment has an ID and already exists in the conversation
        if (attachment.id) {
          const existing = findExistingAttachment(attachment.id);
          if (existing) {
            // Update existing attachment (creates new version)
            await conversationsService.updateAttachment({
              conversationId: targetConversationId,
              attachmentId: attachment.id,
              data,
              description: attachment.description,
            });
            return true;
          }
        }

        // Create new attachment with the provided ID (if any)
        try {
          await conversationsService.createAttachment({
            conversationId: targetConversationId,
            id: attachment.id,
            type: attachment.type,
            data,
            description: attachment.description,
            hidden: attachment.hidden,
          });
        } catch (createError) {
          // If conflict (attachment with this ID already exists), try to update instead
          // This can happen due to race conditions or if existingAttachments wasn't loaded yet
          if (
            attachment.id &&
            createError instanceof Error &&
            createError.message.includes('already exists')
          ) {
            await conversationsService.updateAttachment({
              conversationId: targetConversationId,
              attachmentId: attachment.id,
              data,
              description: attachment.description,
            });
          } else {
            throw createError;
          }
        }

        return true;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to sync flyout attachment:', error);
        return false;
      }
    },
    [conversationsService, findExistingAttachment]
  );

  // Get the set of synced attachment IDs for a conversation
  const getSyncedIdsForConversation = useCallback((convId: string): Set<string> => {
    if (!syncedAttachmentIdsRef.current.has(convId)) {
      syncedAttachmentIdsRef.current.set(convId, new Set());
    }
    return syncedAttachmentIdsRef.current.get(convId)!;
  }, []);

  // Generate a unique key for an attachment
  const getAttachmentKey = useCallback((attachment: AttachmentInput): string => {
    // Use ID if available, otherwise fall back to type
    return attachment.id || attachment.type;
  }, []);

  // Sync all attachments to the conversation
  const syncAllAttachments = useCallback(async () => {
    if (!conversationId || isSyncingRef.current) {
      return;
    }

    // Get attachments to sync (prefer original, fallback to current flyout attachments)
    const allAttachments =
      originalAttachmentsRef.current.length > 0
        ? originalAttachmentsRef.current
        : flyoutAttachments ?? [];

    if (allAttachments.length === 0) {
      return;
    }

    // Filter out attachments that have already been synced to this conversation
    const syncedIds = getSyncedIdsForConversation(conversationId);
    const attachmentsToSync = allAttachments.filter(
      (att) => !syncedIds.has(getAttachmentKey(att))
    );

    // Also check if existing attachments with same ID need updating
    // (flyout was reopened with updated content)
    const attachmentsToUpdate = allAttachments.filter((att) => {
      if (!att.id) return false;
      const existing = findExistingAttachment(att.id);
      return existing && !syncedIds.has(getAttachmentKey(att));
    });

    const needsSync = attachmentsToSync.length > 0 || attachmentsToUpdate.length > 0;
    if (!needsSync) {
      // All attachments already synced, just clean up input pills
      if (resetAttachments) {
        resetAttachments();
      }
      return;
    }

    isSyncingRef.current = true;

    try {
      // Sync all attachments in parallel
      const results = await Promise.all(
        attachmentsToSync.map((att) => syncAttachment(att, conversationId))
      );

      // Track which attachments were successfully synced
      attachmentsToSync.forEach((att, index) => {
        if (results[index]) {
          syncedIds.add(getAttachmentKey(att));
        }
      });

      // If any attachments were synced successfully
      if (results.some(Boolean)) {
        // Invalidate query to refresh UI
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.byId(conversationId),
        });

        // Remove attachments from the input pills area (they're now in the attachments panel)
        if (resetAttachments) {
          resetAttachments();
        }
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [
    conversationId,
    flyoutAttachments,
    syncAttachment,
    queryClient,
    resetAttachments,
    getSyncedIdsForConversation,
    getAttachmentKey,
    findExistingAttachment,
  ]);

  // Sync attachments when conversation ID becomes available or existing attachments are loaded
  useEffect(() => {
    if (
      conversationId &&
      (originalAttachmentsRef.current.length > 0 || flyoutAttachments?.length)
    ) {
      syncAllAttachments();
    }
  }, [conversationId, flyoutAttachments, existingAttachments, syncAllAttachments]);

  return {
    syncAllAttachments,
  };
}
