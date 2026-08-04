import type { AttachmentInput, ConversationAttachment } from '@kbn/agent-builder-common/attachments';
/**
 * Flattens ConversationAttachment[] to AttachmentInput[] for serialization.
 * AttachmentGroups are expanded to their constituent items; individual attachments pass through unchanged.
 * This is the only place groups are dissolved — the server always receives AttachmentInput[].
 *
 * Group items are stamped with group_id and description at this boundary:
 *   - group_id is always set to the group's id, overriding any pre-existing value on the item.
 *     An item pre-setting group_id would be a caller error — group identity belongs to the group.
 *   - description falls back to the group's label if the item does not supply its own.
 */
export declare const flattenAttachments: (attachments: ConversationAttachment[]) => AttachmentInput[];
