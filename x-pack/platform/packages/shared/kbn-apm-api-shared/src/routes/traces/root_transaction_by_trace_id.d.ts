import { z } from '@kbn/zod/v4';
import type { TransactionDetailRedirectInfo } from '@kbn/apm-types';
export interface RootTransactionByTraceIdResponse {
    transaction?: TransactionDetailRedirectInfo;
}
export declare const rootTransactionByTraceIdRoute: {
    endpoint: "GET /internal/apm/traces/{traceId}/root_transaction";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            traceId: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<RootTransactionByTraceIdResponse>;
