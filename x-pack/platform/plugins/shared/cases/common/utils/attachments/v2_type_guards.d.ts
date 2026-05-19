import type { AttachmentRequestV2 } from '../../types/api';
import type { UnifiedAttachmentPayload, UnifiedReferenceAttachmentPayload, UnifiedValueAttachmentPayload } from '../../types/domain';
/**
 * A type narrowing function for  reference-based unified attachment.
 */
export declare const isUnifiedReferenceAttachmentRequest: (context: AttachmentRequestV2) => context is UnifiedReferenceAttachmentPayload;
/**
 * A type narrowing function for value-based unified attachment.
 */
export declare const isUnifiedValueAttachmentRequest: (context: AttachmentRequestV2) => context is UnifiedValueAttachmentPayload;
/**
 * A type narrowing function for unified attachment (either reference or value-based).
 */
export declare const isUnifiedAttachmentRequest: (context: AttachmentRequestV2) => context is UnifiedAttachmentPayload;
export declare const isCommentAttachmentType: (type: string) => boolean;
export declare const isUnifiedCommentAttachment: (attachment: AttachmentRequestV2) => attachment is UnifiedValueAttachmentPayload & {
    type: "comment";
    data: {
        content: string;
    };
};
export declare const isEventAttachmentType: (type: string) => boolean;
export declare const isUnifiedEventAttachment: (attachment: AttachmentRequestV2) => attachment is UnifiedReferenceAttachmentPayload;
export declare const UNIFIED_ALERT_TYPES_ARRAY: string[];
export declare const UNIFIED_ALERT_TYPES: Set<string>;
export declare const isAlertAttachmentType: (type: string) => boolean;
export declare const isUnifiedAlertAttachment: (attachment: AttachmentRequestV2) => attachment is UnifiedReferenceAttachmentPayload;
