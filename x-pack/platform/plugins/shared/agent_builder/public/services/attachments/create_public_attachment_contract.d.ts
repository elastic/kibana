import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { AttachmentsService } from './attachements_service';
export declare const createPublicAttachmentContract: ({ attachmentsService, }: {
    attachmentsService: AttachmentsService;
}) => AttachmentServiceStartContract;
