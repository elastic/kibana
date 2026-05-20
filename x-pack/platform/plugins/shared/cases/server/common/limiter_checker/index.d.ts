import type { FileServiceStart } from '@kbn/files-plugin/server';
import type { AttachmentRequestV2 } from '../../../common/types/api';
import type { AttachmentService } from '../../services';
export declare class AttachmentLimitChecker {
    private readonly caseId;
    private readonly limiters;
    constructor(attachmentService: AttachmentService, fileService: FileServiceStart, caseId: string);
    validate(requests: AttachmentRequestV2[]): Promise<void>;
}
