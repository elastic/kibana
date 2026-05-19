import type { FileServiceStart } from '@kbn/files-plugin/server';
import type { AttachmentRequestV2 } from '../../../../common/types/api';
import { BaseLimiter } from '../base_limiter';
export declare class FileLimiter extends BaseLimiter {
    private readonly fileService;
    constructor(fileService: FileServiceStart);
    countOfItemsWithinCase(caseId: string): Promise<number>;
    countOfItemsInRequest(requests: AttachmentRequestV2[]): number;
}
