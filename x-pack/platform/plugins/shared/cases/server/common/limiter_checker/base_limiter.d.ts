import type { AttachmentType } from '../../../common/types/domain';
import type { AttachmentRequestV2 } from '../../../common/types/api';
import type { Limiter } from './types';
interface LimiterParams {
    limit: number;
    attachmentType: AttachmentType | AttachmentType[];
    field?: string;
    attachmentNoun: string;
}
export declare abstract class BaseLimiter implements Limiter {
    readonly limit: number;
    readonly errorMessage: string;
    constructor(params: LimiterParams);
    abstract countOfItemsWithinCase(caseId: string): Promise<number>;
    abstract countOfItemsInRequest(requests: AttachmentRequestV2[]): number;
}
export {};
