import type { AttachmentPersistedAttributes, UnifiedAttachmentAttributes } from '../types/attachments_v2';
import type { AttachmentTypeTransformer } from './base';
export interface AlertMetadata {
    index?: string | string[];
    rule?: {
        id: string | null;
        name: string | null;
    } | null;
}
/**
 * Transformer for alert attachments (legacy schema <-> unified schema).
 * Legacy: { type: 'alert', alertId, index, rule } (AttachmentType.alert)
 * Unified: { type: owner-scoped alert, attachmentId: string|string[], metadata: { index, rule } }
 */
export declare const alertAttachmentTransformer: AttachmentTypeTransformer<AttachmentPersistedAttributes, UnifiedAttachmentAttributes>;
