import { z } from '@kbn/zod/v4';
export declare const ResolveInstrumentationRequestBody: z.ZodObject<{
    trace_id: z.ZodString;
}, z.core.$strip>;
export type ResolveInstrumentationRequestBody = z.infer<typeof ResolveInstrumentationRequestBody>;
export type ResolveInstrumentationRequestBodyInput = z.input<typeof ResolveInstrumentationRequestBody>;
export declare const ResolveInstrumentationResponse: z.ZodObject<{
    profiles: z.ZodArray<z.ZodObject<{
        profile: z.ZodString;
        evidence: z.ZodObject<{
            user_query: z.ZodObject<{
                status: z.ZodEnum<{
                    found: "found";
                    not_found: "not_found";
                    content_redacted: "content_redacted";
                }>;
                field: z.ZodOptional<z.ZodString>;
                sample: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
            agent_response: z.ZodObject<{
                status: z.ZodEnum<{
                    found: "found";
                    not_found: "not_found";
                    content_redacted: "content_redacted";
                }>;
                field: z.ZodOptional<z.ZodString>;
                sample: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
            tool_calls: z.ZodObject<{
                status: z.ZodEnum<{
                    found: "found";
                    not_found: "not_found";
                    content_redacted: "content_redacted";
                }>;
                field: z.ZodOptional<z.ZodString>;
                sample: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        }, z.core.$strip>;
    }, z.core.$strip>>;
    recommended_instrumentation: z.ZodNullable<z.ZodObject<{
        profile: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ResolveInstrumentationResponse = z.infer<typeof ResolveInstrumentationResponse>;
