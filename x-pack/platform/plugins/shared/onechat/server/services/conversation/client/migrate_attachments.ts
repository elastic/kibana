/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound } from '@kbn/onechat-common';
import type { VersionedAttachment, AttachmentVersion } from '@kbn/onechat-common/attachments';
import { hashContent, estimateTokens } from '@kbn/onechat-common/attachments';
import { v4 as uuidv4 } from 'uuid';

/**
 * Migrates legacy round-level attachments to conversation-level versioned attachments.
 * This function implements lazy on-read migration - it extracts attachments from
 * conversation rounds and converts them to the new versioned attachment format.
 *
 * Deduplication logic:
 * - Attachments with the same type and content hash are considered duplicates
 * - Only the first occurrence creates a new versioned attachment
 * - Subsequent duplicates are ignored (they will be referenced via attachment_refs)
 *
 * @param rounds - Array of conversation rounds to extract attachments from
 * @returns Array of versioned attachments
 */
export const migrateRoundAttachments = (rounds: ConversationRound[]): VersionedAttachment[] => {
  // Map to track attachments by content key (type:hash)
  const attachmentMap = new Map<string, VersionedAttachment>();
  // Map to track attachment ID by content key for reference lookup
  const contentKeyToId = new Map<string, string>();

  rounds.forEach((round) => {
    const roundAttachments = round.input.attachments;
    if (!roundAttachments || roundAttachments.length === 0) {
      return;
    }

    roundAttachments.forEach((attachment) => {
      const contentHash = hashContent(attachment.data);
      const contentKey = `${attachment.type}:${contentHash}`;

      if (!attachmentMap.has(contentKey)) {
        // First occurrence - create version 1
        const id = attachment.id || uuidv4();
        const estimatedTokens = estimateTokens(attachment.data);

        const version: AttachmentVersion = {
          version: 1,
          type: attachment.type,
          data: attachment.data,
          created_at: round.started_at,
          status: 'active',
          content_hash: contentHash,
          estimated_tokens: estimatedTokens,
        };

        const versionedAttachment: VersionedAttachment = {
          id,
          type: attachment.type,
          versions: [version],
          current_version: 1,
          hidden: attachment.hidden,
        };

        attachmentMap.set(contentKey, versionedAttachment);
        contentKeyToId.set(contentKey, id);
      }
      // Note: Duplicate attachments in history are deduplicated.
      // The attachment_refs will be updated separately if needed.
    });
  });

  return Array.from(attachmentMap.values());
};

/**
 * Creates attachment version references for a round's legacy attachments.
 * Used during migration to create refs that point to the migrated versioned attachments.
 *
 * @param attachments - Legacy attachments from a round
 * @param versionedAttachments - Already migrated versioned attachments
 * @returns Array of attachment version references
 */
export const createAttachmentRefs = (
  attachments: any[],
  versionedAttachments: VersionedAttachment[]
): Array<{ attachment_id: string; version: number }> => {
  const refs: Array<{ attachment_id: string; version: number }> = [];

  // Create a lookup map by content hash
  const hashToAttachment = new Map<string, VersionedAttachment>();
  for (const va of versionedAttachments) {
    const latestVersion = va.versions[va.current_version - 1];
    if (latestVersion) {
      const key = `${va.type}:${latestVersion.content_hash}`;
      hashToAttachment.set(key, va);
    }
  }

  for (const attachment of attachments) {
    const contentHash = hashContent(attachment.data);
    const key = `${attachment.type}:${contentHash}`;
    const versionedAttachment = hashToAttachment.get(key);

    if (versionedAttachment) {
      refs.push({
        attachment_id: versionedAttachment.id,
        version: 1, // Migration always creates version 1
      });
    }
  }

  return refs;
};

/**
 * Checks if a conversation needs migration.
 * A conversation needs migration if:
 * - It has no attachments array (old format)
 * - It has rounds with legacy attachments but no conversation-level attachments
 *
 * @param hasAttachments - Whether the conversation has the attachments field
 * @param rounds - Conversation rounds
 * @returns true if migration is needed
 */
export const needsMigration = (hasAttachments: boolean, rounds: ConversationRound[]): boolean => {
  // If already has attachments array, no migration needed
  if (hasAttachments) {
    return false;
  }

  // Check if any rounds have legacy attachments
  for (const round of rounds) {
    if (round.input.attachments && round.input.attachments.length > 0) {
      return true;
    }
  }

  return false;
};
