import { z } from '@kbn/zod/v4';
import type { LatencyCorrelation } from '@kbn/apm-types';
export interface SignificantCorrelationsResponse {
    latencyCorrelations: LatencyCorrelation[];
    ccsWarning: boolean;
    totalDocCount: number;
    fallbackResult?: LatencyCorrelation;
}
export declare const significantCorrelationsTransactionsRoute: {
    endpoint: "POST /internal/apm/correlations/significant_correlations/transactions";
    params?: z.ZodObject<{
        body: z.ZodObject<{
            serviceName: z.ZodOptional<z.ZodString>;
            transactionName: z.ZodOptional<z.ZodString>;
            transactionType: z.ZodOptional<z.ZodString>;
            durationMin: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            durationMax: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            fieldValuePairs: z.ZodArray<z.ZodObject<{
                fieldName: z.ZodString;
                fieldValue: z.ZodUnion<readonly [z.ZodString, z.ZodCoercedNumber<unknown>]>;
            }, z.core.$strip>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<SignificantCorrelationsResponse>;
