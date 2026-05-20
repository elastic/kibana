import type { z } from '@kbn/zod/v4';
import type { UnifiedAttachmentPayload } from '../../../common/types/domain/attachment/v2';
import type { AttachmentRequest, AttachmentRequestV2 } from '../../../common/types/api';
import type { ExternalReferenceAttachmentTypeRegistry } from '../../attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import type { UnifiedAttachmentTypeRegistry } from '../../attachment_framework/unified_attachment_registry';
/** Throws `Boom.badRequest` with a `path: message` summary of every zod issue. */
export declare const parseUnifiedAttachmentWithSchema: (schema: z.ZodType, payload: UnifiedAttachmentPayload, type: string) => void;
export declare const validateLegacyRegisteredAttachments: ({ query, persistableStateAttachmentTypeRegistry, externalReferenceAttachmentTypeRegistry, unifiedAttachmentTypeRegistry, }: {
    query: AttachmentRequest;
    persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
    externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
    unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
}) => void;
export declare const validateUnifiedRegisteredAttachments: ({ query, unifiedAttachmentTypeRegistry, }: {
    query: UnifiedAttachmentPayload;
    unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
}) => void;
export declare const validateRegisteredAttachments: ({ query, persistableStateAttachmentTypeRegistry, externalReferenceAttachmentTypeRegistry, unifiedAttachmentTypeRegistry, }: {
    query: AttachmentRequestV2;
    persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
    externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
    unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
}) => void;
