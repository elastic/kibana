import { z } from '@kbn/zod/v4';
import type { Transaction } from '@kbn/apm-types';
export type TransactionFromTraceByIdResponse = Transaction;
export declare const transactionFromTraceByIdRoute: {
    endpoint: "GET /internal/apm/traces/{traceId}/transactions/{transactionId}";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            traceId: z.ZodString;
            transactionId: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<Transaction>;
