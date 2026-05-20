import type { AttachmentRequest, AttachmentRequestV2 } from '../../../common/types/api';
import type { AttachmentAttributesV2, UnifiedAttachmentPayload } from '../../../common/types/domain';
import type { CommonAttributes, AttachmentPersistedAttributes, UnifiedAttachmentAttributes } from '../types/attachments_v2';
/**
 * Base interface for attachment type transformers.
 * Covers both request payload (API layer) and persisted attributes (SO layer).
 */
export interface AttachmentTypeTransformer<TOld = unknown, TNew = unknown> {
    isLegacyPayload(attachment: AttachmentRequestV2): boolean;
    isUnifiedPayload(attachment: AttachmentRequestV2): boolean;
    toUnifiedPayload(attachment: AttachmentRequestV2): UnifiedAttachmentPayload;
    toLegacyPayload(attachment: AttachmentRequestV2): AttachmentRequest;
    isType(attributes: AttachmentAttributesV2): boolean;
    isUnifiedType(attributes: unknown): boolean;
    isLegacyType(attributes: unknown): boolean;
    toUnifiedSchema(attributes: unknown): TNew;
    toLegacySchema(attributes: unknown): TOld;
}
export declare const passThroughTransformer: AttachmentTypeTransformer<AttachmentPersistedAttributes, UnifiedAttachmentAttributes>;
/**
 * Extracts common attributes from either old or new schema.
 */
export declare function extractCommonAttributes(attributes: AttachmentAttributesV2): CommonAttributes;
