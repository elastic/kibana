import type { AttachmentRequestV2 } from '../../../../common/types/api';
import type { AttachmentService } from '../../../services';
import { BaseLimiter } from '../base_limiter';
export declare class PersistableStateAndExternalReferencesLimiter extends BaseLimiter {
    private readonly attachmentService;
    constructor(attachmentService: AttachmentService);
    countOfItemsWithinCase(caseId: string): Promise<number>;
    countOfItemsInRequest(requests: AttachmentRequestV2[]): number;
}
