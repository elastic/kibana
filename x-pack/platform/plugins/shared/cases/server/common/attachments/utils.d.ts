import type { UnifiedReferenceAttachmentPayload } from '../../../common/types/domain/attachment/v2';
export declare const toReferenceMetadata: (index: string | string[] | undefined) => UnifiedReferenceAttachmentPayload["metadata"];
export declare const normalizeReferenceAttachmentId: (attachmentId: string | string[]) => string | string[];
