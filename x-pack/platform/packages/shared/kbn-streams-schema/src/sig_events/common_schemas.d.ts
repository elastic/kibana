import { z } from '@kbn/zod/v4';
export declare const dependencyEdgeSchema: z.ZodObject<{
    source: z.ZodString;
    target: z.ZodString;
    protocol: z.ZodOptional<z.ZodString>;
    exposure: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const infraComponentSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    workloads: z.ZodOptional<z.ZodArray<z.ZodString>>;
    exposure: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const causeKiSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    stream_name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const evidenceSchema: z.ZodObject<{
    rule_name: z.ZodOptional<z.ZodString>;
    result: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    stream_name: z.ZodOptional<z.ZodString>;
    row_count: z.ZodOptional<z.ZodNumber>;
    collected_at: z.ZodOptional<z.ZodString>;
    esql_query: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    confirmed: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
