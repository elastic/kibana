import { z } from '@kbn/zod/v4';
export interface FallbackToTransactionsResponse {
    fallbackToTransactions: boolean;
}
export declare const fallbackToTransactionsRoute: {
    endpoint: "GET /internal/apm/fallback_to_transactions";
    params?: z.ZodObject<{
        query: z.ZodOptional<z.ZodObject<{
            kuery: z.ZodString;
            start: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
            end: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
        }, z.core.$strip>>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<FallbackToTransactionsResponse>;
