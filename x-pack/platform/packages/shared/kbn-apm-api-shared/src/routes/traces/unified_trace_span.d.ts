import { z } from '@kbn/zod/v4';
import type { UnifiedSpanDocument } from '@kbn/apm-types';
export type UnifiedTraceSpanResponse = UnifiedSpanDocument;
export declare const unifiedTraceSpanRoute: {
    endpoint: "GET /internal/apm/unified_traces/{traceId}/spans/{spanId}";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            traceId: z.ZodString;
            spanId: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<UnifiedSpanDocument>;
