import type { FileAttachmentMetadata } from '../../../common/types/domain_zod/attachment/file/v2';
import type { UnifiedAttachmentTypeSetup } from '../types';
export declare const fileAttachmentType: UnifiedAttachmentTypeSetup;
export type { FileAttachmentMetadata };
/**
 * Decodes the `metadata` slice for transformer / read paths that don't have
 * the full payload. Mirrors the registry's full-payload `schema` validation.
 */
export declare const decodeFileAttachmentMetadata: (data: unknown) => FileAttachmentMetadata;
