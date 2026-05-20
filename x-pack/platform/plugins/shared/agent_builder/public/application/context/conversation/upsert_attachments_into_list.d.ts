import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
/**
 * Merges `nextAttachments` into `existingAttachments` (upsert by id).
 *
 * - Existing items with a matching `id` in `nextAttachments` are replaced (updated in place).
 * - Items in `nextAttachments` whose `id` is not in the existing list are appended.
 * - Items without an `id` are always appended.
 *
 * Order: existing list (with updates applied), then new items. Does not mutate inputs.
 */
export declare const upsertAttachmentsIntoList: (existingAttachments: AttachmentInput[] | undefined, nextAttachments: AttachmentInput[]) => AttachmentInput[];
