import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { ValidateAttachmentResult } from './validate_attachment';
export interface AttachmentServiceSetup {
    registerType(attachmentType: AttachmentTypeDefinition): void;
}
export interface AttachmentServiceStart {
    validate<Type extends string, Data>(attachment: AttachmentInput<Type, Data>): Promise<ValidateAttachmentResult<Type, Data>>;
    getTypeDefinition(type: string): AttachmentTypeDefinition | undefined;
    getRegisteredTypeIds(): string[];
}
