import { AttachmentTypeRegistry } from '../../common/registry';
import type { UnifiedAttachmentType, UnifiedAttachmentTypeSetup } from './types';
export declare class UnifiedAttachmentTypeRegistry extends AttachmentTypeRegistry<UnifiedAttachmentType> {
    constructor();
    register(attachmentType: UnifiedAttachmentTypeSetup): void;
}
