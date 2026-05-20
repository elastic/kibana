import type { AttachmentPersistedAttributes, UnifiedAttachmentAttributes } from '../types/attachments_v2';
import type { AttachmentTypeTransformer } from './base';
/**
 * Generic transformer for external reference attachments (legacy externalReference schema <-> unified schema).
 *
 * Legacy: { type: 'externalReference', externalReferenceId, externalReferenceStorage,
 *           externalReferenceAttachmentTypeId, externalReferenceMetadata }
 * Unified: { type: '<solution>.<subtype>', attachmentId, metadata }
 *
 * The mapping from externalReferenceAttachmentTypeId to unified type name is driven by
 * EXTERNAL_REFERENCE_TYPE_MAP in common/constants/attachments.ts. Add new entries there
 * as more external reference subtypes are migrated.
 */
export declare const externalReferenceAttachmentTransformer: AttachmentTypeTransformer<AttachmentPersistedAttributes, UnifiedAttachmentAttributes>;
