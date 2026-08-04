import type { AttachmentRequest, AttachmentRequestV2 } from '../../types/api';
import type { AlertAttachmentPayload, EventAttachmentPayload, ExternalReferenceAttachmentPayload, PersistableStateAttachmentPayload, UnifiedAttachmentPayload, UserCommentAttachmentPayload } from '../../types/domain';
/**
 * A type narrowing function for external reference attachments.
 */
export declare const isCommentRequestTypeExternalReference: (context: AttachmentRequestV2) => context is ExternalReferenceAttachmentPayload;
/**
 * A type narrowing function for persistable state attachments.
 */
export declare const isCommentRequestTypePersistableState: (context: Partial<AttachmentRequest> | UnifiedAttachmentPayload) => context is PersistableStateAttachmentPayload;
export declare const isLegacyAttachmentRequest: (context: AttachmentRequestV2) => context is AttachmentRequest;
export declare const isLegacyCommentAttachment: (attachment: AttachmentRequestV2) => attachment is UserCommentAttachmentPayload;
export declare const isLegacyEventAttachment: (attachment: AttachmentRequestV2) => attachment is EventAttachmentPayload;
export declare const isLegacyAlertAttachment: (attachment: AttachmentRequestV2) => attachment is AlertAttachmentPayload;
