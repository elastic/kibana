import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
export interface AttachmentTypeRegistry {
    register(attachmentType: AttachmentTypeDefinition): void;
    has(attachmentTypeId: string): boolean;
    get(attachmentTypeId: string): AttachmentTypeDefinition | undefined;
    list(): AttachmentTypeDefinition[];
}
export declare const createAttachmentTypeRegistry: () => AttachmentTypeRegistry;
