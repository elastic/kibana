/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type {
  Attachment,
  VersionedAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import { hashContent, estimateTokens } from '@kbn/agent-builder-common/attachments';

/**
 * Checks if a conversation needs migration from legacy round-level attachments
 * to conversation-level versioned attachments.
 *
 * @param hasVersionedAttachments - Whether the conversation already has the attachments field
 * @param rounds - The conversation rounds to check for legacy attachments
 * @returns true if migration is needed, false otherwise
 */
export const needsMigration = (
  hasVersionedAttachments: boolean,
  rounds: ConversationRound[]
): boolean => {
  // If already has versioned attachments, no migration needed
  if (hasVersionedAttachments) {
    return false;
  }

  // Check if any round has legacy attachments
  return rounds.some((round) => {
    const attachments = round.input?.attachments;
    return attachments && attachments.length > 0;
  });
};

/**
 * Creates a deduplication key for an attachment based on type and content hash.
 */
const createDeduplicationKey = (type: string, contentHash: string): string => {
  return `${type}:${contentHash}`;
};

interface MigrationEntry {
  attachment: VersionedAttachment;
  contentHash: string;
  firstSeenAt: string;
}

/**
 * Migrates legacy round-level attachments to conversation-level versioned attachments.
 * Deduplicates attachments by content hash - if the same content appears in multiple rounds,
 * only one versioned attachment is created.
 *
 * @param rounds - The conversation rounds containing legacy attachments
 * @returns Array of versioned attachments extracted from all rounds (deduplicated)
 */
export const migrateRoundAttachments = (rounds: ConversationRound[]): VersionedAttachment[] => {
  // Map for deduplication: key is "type:contentHash"
  const seenAttachments = new Map<string, MigrationEntry>();

  for (const round of rounds) {
    const attachments = round.input?.attachments;
    if (!attachments || attachments.length === 0) {
      continue;
    }

    const roundTimestamp = round.started_at || new Date().toISOString();

    for (const attachment of attachments) {
      const contentHash = hashContent(attachment.data);
      const dedupeKey = createDeduplicationKey(attachment.type, contentHash);

      // Skip if we've already seen this exact content
      if (seenAttachments.has(dedupeKey)) {
        continue;
      }

      // Create versioned attachment from legacy attachment
      const versionedAttachment = convertLegacyToVersioned(attachment, contentHash, roundTimestamp);

      seenAttachments.set(dedupeKey, {
        attachment: versionedAttachment,
        contentHash,
        firstSeenAt: roundTimestamp,
      });
    }
  }

  // Return all unique attachments
  return Array.from(seenAttachments.values()).map((entry) => entry.attachment);
};

/**
 * Converts a legacy attachment to a versioned attachment.
 */
const convertLegacyToVersioned = (
  legacy: Attachment,
  contentHash: string,
  createdAt: string
): VersionedAttachment => {
  // Use existing ID if present, otherwise generate new one
  const id = legacy.id || uuidv4();

  return {
    id,
    type: legacy.type,
    versions: [
      {
        version: 1,
        data: legacy.data,
        created_at: createdAt,
        content_hash: contentHash,
        estimated_tokens: estimateTokens(legacy.data),
      },
    ],
    current_version: 1,
    active: true,
    hidden: legacy.hidden,
    // If the legacy attachment had an id, it was likely client-provided
    // Store it as client_id for reference
    ...(legacy.id && { client_id: legacy.id }),
  };
};

/**
 * Creates attachment references for rounds based on the migrated versioned attachments.
 * This maps legacy attachments in round inputs to their corresponding versioned attachment IDs.
 *
 * @param rounds - The conversation rounds with legacy attachments
 * @param versionedAttachments - The migrated versioned attachments
 * @returns Map from round index to array of attachment refs
 */
export const createAttachmentRefs = (
  rounds: ConversationRound[],
  versionedAttachments: VersionedAttachment[]
): Map<number, AttachmentVersionRef[]> => {
  // Create a lookup map from content hash to versioned attachment
  const hashToAttachment = new Map<string, VersionedAttachment>();
  for (const va of versionedAttachments) {
    const latestVersion = va.versions.find((v) => v.version === va.current_version);
    if (latestVersion) {
      const dedupeKey = createDeduplicationKey(va.type, latestVersion.content_hash);
      hashToAttachment.set(dedupeKey, va);
    }
  }

  const roundRefs = new Map<number, AttachmentVersionRef[]>();

  rounds.forEach((round, roundIndex) => {
    const attachments = round.input?.attachments;
    if (!attachments || attachments.length === 0) {
      return;
    }

    const refs: AttachmentVersionRef[] = [];

    for (const attachment of attachments) {
      const contentHash = hashContent(attachment.data);
      const dedupeKey = createDeduplicationKey(attachment.type, contentHash);
      const versionedAttachment = hashToAttachment.get(dedupeKey);

      if (versionedAttachment) {
        refs.push({
          attachment_id: versionedAttachment.id,
          version: 1, // All migrated attachments start at version 1
        });
      }
    }

    if (refs.length > 0) {
      roundRefs.set(roundIndex, refs);
    }
  });

  return roundRefs;
};

/**
 * Gets all legacy attachments from all rounds (without deduplication).
 * Useful for checking if any migration is needed.
 */
export const getAllLegacyAttachments = (rounds: ConversationRound[]): Attachment[] => {
  const allAttachments: Attachment[] = [];

  for (const round of rounds) {
    const attachments = round.input?.attachments;
    if (attachments && attachments.length > 0) {
      allAttachments.push(...attachments);
    }
  }

  return allAttachments;
};
