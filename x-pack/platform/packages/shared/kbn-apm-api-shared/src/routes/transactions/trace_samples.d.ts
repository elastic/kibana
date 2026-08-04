import { z } from '@kbn/zod/v4';
export interface TransactionTraceSamplesResponse {
    traceSamples: Array<{
        score: number | null | undefined;
        timestamp: string;
        transactionId: string;
        traceId: string;
    }>;
}
export declare const transactionTraceSamplesRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/transactions/traces/samples";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            transactionType: z.ZodString;
            transactionName: z.ZodString;
            transactionId: z.ZodOptional<z.ZodString>;
            traceId: z.ZodOptional<z.ZodString>;
            sampleRangeFrom: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            sampleRangeTo: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<TransactionTraceSamplesResponse>;
