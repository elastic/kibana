import { type AttachmentTypeRegistry } from './attachment_type_registry';
import type { AttachmentServiceSetup, AttachmentServiceStart } from './types';
export interface AttachmentService {
    setup: () => AttachmentServiceSetup;
    start: () => AttachmentServiceStart;
}
export declare const createAttachmentService: () => AttachmentService;
export declare class AttachmentServiceImpl implements AttachmentService {
    readonly attachmentTypeRegistry: AttachmentTypeRegistry;
    constructor();
    setup(): AttachmentServiceSetup;
    start(): AttachmentServiceStart;
}
