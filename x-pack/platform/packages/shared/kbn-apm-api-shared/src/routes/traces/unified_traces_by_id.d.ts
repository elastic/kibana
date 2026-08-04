import { z } from '@kbn/zod/v4';
import type { Error as ApmError, TraceItem, Transaction } from '@kbn/apm-types';
export interface UnifiedTracesByIdResponse {
    traceItems: TraceItem[];
    errors: ApmError[];
    agentMarks: Record<string, number>;
    entryTransaction?: Transaction;
    traceDocsTotal: number;
    maxTraceItems: number;
}
export declare const unifiedTracesByIdRoute: {
    endpoint: "GET /internal/apm/unified_traces/{traceId}";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            traceId: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            serviceName: z.ZodOptional<z.ZodString>;
            entryTransactionId: z.ZodOptional<z.ZodString>;
            ecsOnly: z.ZodOptional<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
                true: "true";
                false: "false";
            }>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<UnifiedTracesByIdResponse>;
