import { z } from '@kbn/zod/v4';
import type { ErrorsByTraceId } from '@kbn/apm-types';
export declare const unifiedTracesByIdErrorsRoute: {
    endpoint: "GET /internal/apm/unified_traces/{traceId}/errors";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            traceId: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            docId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ErrorsByTraceId>;
