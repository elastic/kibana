import { z } from '@kbn/zod/v4';
import type { TraceRootSpan } from '@kbn/apm-types';
export type UnifiedTracesRootSpanResponse = TraceRootSpan;
export declare const unifiedTracesRootSpanRoute: {
    endpoint: "GET /internal/apm/unified_traces/{traceId}/root_span";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            traceId: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<TraceRootSpan>;
