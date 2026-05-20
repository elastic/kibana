import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
export type ServerError = IHttpFetchError<ResponseErrorBody>;
export declare const useBulkDisable: () => import("@kbn/react-query").UseMutationResult<{
    scheduled_report_ids: string[];
    errors: Array<{
        message: string;
        status?: number;
        id: string;
    }>;
    total: number;
}, ServerError, {
    ids: string[];
}, unknown>;
