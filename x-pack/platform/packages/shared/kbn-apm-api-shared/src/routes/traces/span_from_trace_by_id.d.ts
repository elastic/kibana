import { z } from '@kbn/zod/v4';
import type { Span, Transaction } from '@kbn/apm-types';
export interface SpanFromTraceByIdResponse {
    span?: Span;
    parentTransaction?: Transaction;
}
export declare const spanFromTraceByIdRoute: {
    endpoint: "GET /internal/apm/traces/{traceId}/spans/{spanId}";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            traceId: z.ZodString;
            spanId: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            parentTransactionId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<SpanFromTraceByIdResponse>;
