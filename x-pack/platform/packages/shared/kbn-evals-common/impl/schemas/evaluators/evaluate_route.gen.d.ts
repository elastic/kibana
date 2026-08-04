import { z } from '@kbn/zod/v4';
export declare const EvaluateRequestBody: z.ZodObject<{
    subject: z.ZodObject<{
        mode: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            "single-turn": "single-turn";
            "multi-turn": "multi-turn";
        }>>>;
        traces: z.ZodArray<z.ZodObject<{
            trace_id: z.ZodString;
            reference_data: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        }, z.core.$strip>>;
        instrumentation: z.ZodOptional<z.ZodObject<{
            profile: z.ZodDefault<z.ZodEnum<{
                "elastic-inference": "elastic-inference";
                "otel-genai-events": "otel-genai-events";
                "otel-genai-attributes": "otel-genai-attributes";
                "claude-code": "claude-code";
            }>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    evaluators: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        version: z.ZodOptional<z.ZodString>;
        connector_id: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type EvaluateRequestBody = z.infer<typeof EvaluateRequestBody>;
export type EvaluateRequestBodyInput = z.input<typeof EvaluateRequestBody>;
export declare const EvaluateResponse: z.ZodObject<{
    results: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<{
            error: "error";
            ok: "ok";
        }>;
        evaluator: z.ZodObject<{
            name: z.ZodString;
            version: z.ZodString;
            kind: z.ZodEnum<{
                code: "code";
                llm: "llm";
            }>;
        }, z.core.$strip>;
        scores: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            label: z.ZodOptional<z.ZodString>;
            explanation: z.ZodOptional<z.ZodString>;
            metadata: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        }, z.core.$strip>>>;
        error: z.ZodOptional<z.ZodObject<{
            code: z.ZodOptional<z.ZodLiteral<"evidence_unmet">>;
            message: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type EvaluateResponse = z.infer<typeof EvaluateResponse>;
