import { z } from '@kbn/zod/v4';
export declare const TraceSummary: z.ZodObject<{
    trace_id: z.ZodString;
    name: z.ZodString;
    start_time: z.ZodString;
    duration_ms: z.ZodNumber;
    status: z.ZodOptional<z.ZodString>;
    total_spans: z.ZodOptional<z.ZodNumber>;
    input_preview: z.ZodOptional<z.ZodString>;
    output_preview: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
    tokens: z.ZodOptional<z.ZodObject<{
        input: z.ZodOptional<z.ZodNumber>;
        output: z.ZodOptional<z.ZodNumber>;
        total: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    prompt_id: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type TraceSummary = z.infer<typeof TraceSummary>;
export declare const GetProjectTracesRequestQuery: z.ZodObject<{
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    sort_field: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        name: "name";
        duration: "duration";
        start_time: "start_time";
    }>>>;
    sort_order: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    per_page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
export type GetProjectTracesRequestQuery = z.infer<typeof GetProjectTracesRequestQuery>;
export type GetProjectTracesRequestQueryInput = z.input<typeof GetProjectTracesRequestQuery>;
export declare const GetProjectTracesRequestParams: z.ZodObject<{
    projectName: z.ZodString;
}, z.core.$strip>;
export type GetProjectTracesRequestParams = z.infer<typeof GetProjectTracesRequestParams>;
export type GetProjectTracesRequestParamsInput = z.input<typeof GetProjectTracesRequestParams>;
export declare const GetProjectTracesResponse: z.ZodObject<{
    traces: z.ZodArray<z.ZodObject<{
        trace_id: z.ZodString;
        name: z.ZodString;
        start_time: z.ZodString;
        duration_ms: z.ZodNumber;
        status: z.ZodOptional<z.ZodString>;
        total_spans: z.ZodOptional<z.ZodNumber>;
        input_preview: z.ZodOptional<z.ZodString>;
        output_preview: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
        tokens: z.ZodOptional<z.ZodObject<{
            input: z.ZodOptional<z.ZodNumber>;
            output: z.ZodOptional<z.ZodNumber>;
            total: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        prompt_id: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    total: z.ZodNumber;
}, z.core.$strip>;
export type GetProjectTracesResponse = z.infer<typeof GetProjectTracesResponse>;
