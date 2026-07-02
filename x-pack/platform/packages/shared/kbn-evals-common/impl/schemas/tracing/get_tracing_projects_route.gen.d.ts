import { z } from '@kbn/zod/v4';
export declare const TracingProject: z.ZodObject<{
    name: z.ZodString;
    trace_count: z.ZodNumber;
    error_rate: z.ZodOptional<z.ZodNumber>;
    p50_latency_ms: z.ZodOptional<z.ZodNumber>;
    p99_latency_ms: z.ZodOptional<z.ZodNumber>;
    total_tokens: z.ZodOptional<z.ZodNumber>;
    last_trace_time: z.ZodString;
}, z.core.$strip>;
export type TracingProject = z.infer<typeof TracingProject>;
export declare const GetTracingProjectsRequestQuery: z.ZodObject<{
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    per_page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
export type GetTracingProjectsRequestQuery = z.infer<typeof GetTracingProjectsRequestQuery>;
export type GetTracingProjectsRequestQueryInput = z.input<typeof GetTracingProjectsRequestQuery>;
export declare const GetTracingProjectsResponse: z.ZodObject<{
    projects: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        trace_count: z.ZodNumber;
        error_rate: z.ZodOptional<z.ZodNumber>;
        p50_latency_ms: z.ZodOptional<z.ZodNumber>;
        p99_latency_ms: z.ZodOptional<z.ZodNumber>;
        total_tokens: z.ZodOptional<z.ZodNumber>;
        last_trace_time: z.ZodString;
    }, z.core.$strip>>;
    total: z.ZodNumber;
}, z.core.$strip>;
export type GetTracingProjectsResponse = z.infer<typeof GetTracingProjectsResponse>;
