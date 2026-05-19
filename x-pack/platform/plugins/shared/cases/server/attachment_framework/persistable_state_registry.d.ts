import { AttachmentTypeRegistry } from '../../common/registry';
import type { PersistableStateAttachmentType, PersistableStateAttachmentTypeSetup } from './types';
export declare class PersistableStateAttachmentTypeRegistry extends AttachmentTypeRegistry<PersistableStateAttachmentType> {
    constructor();
    register(attachmentType: PersistableStateAttachmentTypeSetup): void;
}
