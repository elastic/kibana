import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
/**
 * Merges `nextAttachments` into `existingAttachments` (upsert by id).
 *
 * - Existing items with a matching `id` are replaced (updated in place).
 *   AttachmentGroup always has an `id`; AttachmentInput.id is optional.
 * - Items whose `id` is not in the existing list are appended.
 * - Items without an `id` are always appended.
 *
 * Order: existing list (with updates applied), then new items. Does not mutate inputs.
 */
export declare const upsertAttachmentsIntoList: (existingAttachments: ConversationAttachment[] | undefined, nextAttachments: ConversationAttachment[]) => ConversationAttachment[];
