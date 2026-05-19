import type { AttachmentPersistedAttributes, UnifiedAttachmentAttributes } from '../types/attachments_v2';
import type { AttachmentTypeTransformer } from './base';
/**
 * Transformer for event attachments (legacy schema <-> unified schema).
 * Legacy: { type: 'event', eventId, index } (AttachmentType.event)
 * Unified: { type: securitySolution scoped event, attachmentId: string|string[], metadata }
 *
 * eventId is mapped directly to attachmentId (including arrays for backward compatibility).
 */
export declare const eventAttachmentTransformer: AttachmentTypeTransformer<AttachmentPersistedAttributes, UnifiedAttachmentAttributes>;
