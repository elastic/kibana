import { z } from '@kbn/zod/v4';
import type { Transaction } from '@kbn/apm-types';
export interface TransactionByIdResponse {
    transaction?: Transaction;
}
export declare const transactionByIdRoute: {
    endpoint: "GET /internal/apm/transactions/{transactionId}";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            transactionId: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<TransactionByIdResponse>;
