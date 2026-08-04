import { z } from '@kbn/zod/v4';
import type { ColdstartRateResponse } from './coldstart_rate';
export type ColdstartRateByTransactionNameResponse = ColdstartRateResponse;
export declare const transactionChartsColdstartRateByTransactionNameRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate_by_transaction_name";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            transactionType: z.ZodString;
            transactionName: z.ZodString;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            offset: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ColdstartRateResponse>;
