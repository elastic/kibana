import type { Attachment, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeRegistry } from './attachment_type_registry';
export type ValidateAttachmentResult<Type extends string, Data> = {
    valid: true;
    attachment: Attachment<Type, Data>;
} | {
    valid: false;
    error: string;
};
export declare const validateAttachment: <Type extends string, Data>({ attachment, registry, }: {
    attachment: AttachmentInput<Type, Data>;
    registry: AttachmentTypeRegistry;
}) => Promise<ValidateAttachmentResult<Type, Data>>;
