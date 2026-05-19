import type { AttachmentRequest, AttachmentRequestV2 } from '../../../common/types/api';
import type { UnifiedAttachmentPayload, UnifiedValueAttachmentPayload, AttachmentAttributesV2 } from '../../../common/types/domain/attachment/v2';
import type { UserCommentAttachmentPayload } from '../../../common/types/domain';
import { COMMENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type { AttachmentPersistedAttributes, UnifiedAttachmentAttributes } from '../types/attachments_v2';
import type { AttachmentTypeTransformer } from './base';
export declare function isLegacyPayloadCommentAttachment(attachment: AttachmentRequestV2): attachment is UserCommentAttachmentPayload;
/**
 * Type guard to check if an attachment is a unified request payload (has 'data.content' field).
 */
export declare function isUnifiedPayloadCommentAttachment(attachment: AttachmentRequestV2): attachment is UnifiedValueAttachmentPayload & {
    type: typeof COMMENT_ATTACHMENT_TYPE;
    data: {
        content: string;
    };
};
export declare function toUnifiedPayloadCommentAttachment(legacyRequest: AttachmentRequest): UnifiedValueAttachmentPayload;
export declare function toLegacyPayloadCommentAttachment(unifiedPayload: UnifiedValueAttachmentPayload): AttachmentRequest;
/**
 * Transformer for comment attachments (old schema <-> unified schema).
 * Accepts either old or new schema; returns the requested schema so callers need not branch on type.
 */
export declare const commentAttachmentTransformer: AttachmentTypeTransformer<AttachmentPersistedAttributes, UnifiedAttachmentAttributes>;
/**
 * Type guard for a patch (or any object) that includes a comment field. Use when transforming update patches for new SO.
 */
export declare function hasCommentField(patch: unknown): patch is {
    comment: string;
} & Record<string, unknown>;
/**
 * Transforms a patch that has a `comment` field into the unified patch shape (`data.content`). Use for updates when writing to new SO.
 */
export declare function transformCommentPatchToUnifiedPatch<T extends Record<string, unknown>>(patch: T): Omit<T, 'comment'> & {
    data?: {
        content: string;
    };
};
/**
 * Returns comment content from a unified attachment payload when type is 'comment'.
 * Returns empty string for non-comment payloads or when data.content is missing.
 * Use this to avoid leaking attachment-type logic (e.g. 'comment', data.content) into generic utils.
 */
export declare function getCommentContentFromUnifiedPayload(payload: UnifiedAttachmentPayload): string;
/**
 * Extracts the comment content from either old or new schema.
 */
export declare function extractCommentContent(attributes: AttachmentAttributesV2): string;
