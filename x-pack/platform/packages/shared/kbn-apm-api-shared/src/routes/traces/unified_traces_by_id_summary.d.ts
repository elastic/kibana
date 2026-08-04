import { z } from '@kbn/zod/v4';
import type { FocusedTraceItems } from '@kbn/apm-types';
export interface UnifiedTracesByIdSummaryResponse {
    traceItems?: FocusedTraceItems;
    summary: {
        services: number;
        traceEvents: number;
        errors: number;
    };
}
export declare const unifiedTracesByIdSummaryRoute: {
    endpoint: "GET /internal/apm/unified_traces/{traceId}/summary";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            traceId: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            maxTraceItems: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            docId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<UnifiedTracesByIdSummaryResponse>;
