import { z } from '@kbn/zod/v4';
import type { FailedTransactionsCorrelation } from '@kbn/apm-types';
export interface PValuesResponse {
    failedTransactionsCorrelations: FailedTransactionsCorrelation[];
    ccsWarning: boolean;
    fallbackResult?: FailedTransactionsCorrelation;
}
export declare const pValuesTransactionsRoute: {
    endpoint: "POST /internal/apm/correlations/p_values/transactions";
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
            fieldCandidates: z.ZodArray<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<PValuesResponse>;
