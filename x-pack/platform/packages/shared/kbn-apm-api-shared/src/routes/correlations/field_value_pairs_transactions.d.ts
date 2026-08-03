import { z } from '@kbn/zod/v4';
import type { FieldValuePair } from '@kbn/apm-types';
export interface FieldValuePairsResponse {
    fieldValuePairs: FieldValuePair[];
    errors: any[];
}
export declare const fieldValuePairsTransactionsRoute: {
    endpoint: "POST /internal/apm/correlations/field_value_pairs/transactions";
    params?: z.ZodObject<{
        body: z.ZodObject<{
            serviceName: z.ZodOptional<z.ZodString>;
            transactionName: z.ZodOptional<z.ZodString>;
            transactionType: z.ZodOptional<z.ZodString>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            fieldCandidates: z.ZodArray<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<FieldValuePairsResponse>;
