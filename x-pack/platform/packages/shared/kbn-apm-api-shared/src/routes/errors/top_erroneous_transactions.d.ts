import { z } from '@kbn/zod/v4';
export interface TopErroneousTransactionsResponse {
    topErroneousTransactions: Array<{
        transactionName: string;
        currentPeriodTimeseries: Array<{
            x: number;
            y: number;
        }>;
        previousPeriodTimeseries: Array<{
            x: number;
            y: number;
        }>;
        transactionType: string | undefined;
        occurrences: number;
    }>;
}
export declare const topErroneousTransactionsRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/errors/{groupId}/top_erroneous_transactions";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
            groupId: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            offset: z.ZodOptional<z.ZodString>;
            numBuckets: z.ZodCoercedNumber<unknown>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<TopErroneousTransactionsResponse>;
