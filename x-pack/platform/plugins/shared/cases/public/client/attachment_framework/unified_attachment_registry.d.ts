import { AttachmentTypeRegistry } from '../../../common/registry';
import type { UnifiedReferenceAttachmentType, UnifiedValueAttachmentType } from './types';
export declare class UnifiedAttachmentTypeRegistry extends AttachmentTypeRegistry<UnifiedValueAttachmentType | UnifiedReferenceAttachmentType> {
    constructor();
}
