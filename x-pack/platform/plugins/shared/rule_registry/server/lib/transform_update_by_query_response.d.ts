import type { estypes } from '@elastic/elasticsearch';
export interface BulkUpdateApiResponse {
    total: number;
    updated: number;
    failures?: Array<{
        id: string;
        index: string;
        code: string;
        message: string;
    }>;
}
export declare const transformUpdateByQueryResponse: (res: estypes.UpdateByQueryResponse) => BulkUpdateApiResponse;
