import type { AttachmentRequest, AttachmentRequestV2 } from '../../../common/types/api';
import type { UnifiedAttachmentPayload } from '../../../common/types/domain/attachment/v2';
import type { AttachmentPersistedAttributes, UnifiedAttachmentAttributes } from '../types/attachments_v2';
import type { AttachmentTypeTransformer } from './base';
export declare function isLegacyPayloadPersistableStateAttachment(attachment: AttachmentRequestV2): boolean;
export declare function isUnifiedPayloadPersistableStateAttachment(attachment: AttachmentRequestV2): boolean;
export declare function toUnifiedPayloadPersistableStateAttachment(attachment: AttachmentRequestV2): UnifiedAttachmentPayload;
export declare function toLegacyPayloadPersistableStateAttachment(unifiedPayload: AttachmentRequestV2): AttachmentRequest;
/**
 * Transformer for migrated persistable visualization attachments (e.g. Lens): legacy
 * `persistableState` wrapper <-> unified value shape (`type` + `data.state`).
 */
export declare const persistableStateAttachmentTransformer: AttachmentTypeTransformer<AttachmentPersistedAttributes, UnifiedAttachmentAttributes>;
