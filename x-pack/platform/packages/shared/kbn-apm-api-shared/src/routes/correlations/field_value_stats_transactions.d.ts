import { z } from '@kbn/zod/v4';
import type { TopValuesStats } from '@kbn/apm-types';
export type FieldValueStatsTransactionsResponse = TopValuesStats;
export declare const fieldValueStatsTransactionsRoute: {
    endpoint: "GET /internal/apm/correlations/field_value_stats/transactions";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            serviceName: z.ZodOptional<z.ZodString>;
            transactionName: z.ZodOptional<z.ZodString>;
            transactionType: z.ZodOptional<z.ZodString>;
            samplerShardSize: z.ZodOptional<z.ZodString>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            fieldName: z.ZodString;
            fieldValue: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<TopValuesStats>;
