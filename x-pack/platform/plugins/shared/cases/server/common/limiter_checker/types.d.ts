import type { AttachmentRequestV2 } from '../../../common/types/api';
export interface Limiter {
    readonly limit: number;
    readonly errorMessage: string;
    countOfItemsWithinCase(caseId: string): Promise<number>;
    countOfItemsInRequest: (requests: Array<AttachmentRequestV2>) => number;
}
