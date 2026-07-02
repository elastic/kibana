import { z } from '@kbn/zod/v4';
export declare const GetTraceRequestParams: z.ZodObject<{
    traceId: z.ZodString;
}, z.core.$strip>;
export type GetTraceRequestParams = z.infer<typeof GetTraceRequestParams>;
export type GetTraceRequestParamsInput = z.input<typeof GetTraceRequestParams>;
export declare const GetTraceResponse: z.ZodObject<{
    trace_id: z.ZodString;
    spans: z.ZodArray<z.ZodObject<{
        span_id: z.ZodString;
        trace_id: z.ZodString;
        parent_span_id: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
        start_time: z.ZodString;
        end_time: z.ZodOptional<z.ZodString>;
        duration_ms: z.ZodNumber;
        attributes: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    }, z.core.$strip>>;
    total_spans: z.ZodNumber;
    duration_ms: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type GetTraceResponse = z.infer<typeof GetTraceResponse>;
