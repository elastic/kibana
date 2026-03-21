import type { ConversationRound } from '@kbn/agent-builder-common';
import type { Attachment, VersionedAttachment, AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
/**
 * Checks if a conversation needs migration from legacy round-level attachments
 * to conversation-level versioned attachments.
 *
 * @param hasVersionedAttachments - Whether the conversation already has the attachments field
 * @param rounds - The conversation rounds to check for legacy attachments
 * @returns true if migration is needed, false otherwise
 */
export declare const needsMigration: (hasVersionedAttachments: boolean, rounds: ConversationRound[]) => boolean;
/**
 * Migrates legacy round-level attachments to conversation-level versioned attachments.
 * Deduplicates attachments by content hash - if the same content appears in multiple rounds,
 * only one versioned attachment is created.
 *
 * @param rounds - The conversation rounds containing legacy attachments
 * @returns Array of versioned attachments extracted from all rounds (deduplicated)
 */
export declare const migrateRoundAttachments: (rounds: ConversationRound[]) => VersionedAttachment[];
/**
 * Creates attachment references for rounds based on the migrated versioned attachments.
 * This maps legacy attachments in round inputs to their corresponding versioned attachment IDs.
 *
 * @param rounds - The conversation rounds with legacy attachments
 * @param versionedAttachments - The migrated versioned attachments
 * @returns Map from round index to array of attachment refs
 */
export declare const createAttachmentRefs: (rounds: ConversationRound[], versionedAttachments: VersionedAttachment[]) => Map<number, AttachmentVersionRef[]>;
/**
 * Merge attachment refs by attachment id + version + actor to avoid duplicates.
 */
export declare const mergeAttachmentRefs: (previous?: AttachmentVersionRef[], next?: AttachmentVersionRef[]) => AttachmentVersionRef[] | undefined;
/**
 * Apply refs to rounds, merging with any existing refs on the round input.
 */
export declare const applyAttachmentRefsToRounds: (rounds: ConversationRound[], refsByRound: Map<number, AttachmentVersionRef[]>) => ConversationRound[];
/**
 * Gets all legacy attachments from all rounds (without deduplication).
 * Useful for checking if any migration is needed.
 */
export declare const getAllLegacyAttachments: (rounds: ConversationRound[]) => Attachment[];
