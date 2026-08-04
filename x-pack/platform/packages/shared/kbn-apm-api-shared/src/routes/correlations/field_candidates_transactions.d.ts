import { z } from '@kbn/zod/v4';
export interface DurationFieldCandidatesResponse {
    fieldCandidates: string[];
}
export declare const fieldCandidatesTransactionsRoute: {
    endpoint: "GET /internal/apm/correlations/field_candidates/transactions";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            serviceName: z.ZodOptional<z.ZodString>;
            transactionName: z.ZodOptional<z.ZodString>;
            transactionType: z.ZodOptional<z.ZodString>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<DurationFieldCandidatesResponse>;
