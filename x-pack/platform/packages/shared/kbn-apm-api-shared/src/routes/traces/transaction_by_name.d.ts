import { z } from '@kbn/zod/v4';
import type { TransactionDetailRedirectInfo } from '@kbn/apm-types';
export interface TransactionByNameResponse {
    transaction?: TransactionDetailRedirectInfo;
}
export declare const transactionByNameRoute: {
    endpoint: "GET /internal/apm/transactions";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            transactionName: z.ZodString;
            serviceName: z.ZodString;
            environment: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<TransactionByNameResponse>;
