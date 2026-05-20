import { z } from '@kbn/zod/v4';
export declare const UpsertDatasetExamplePayload: z.ZodObject<{
    input: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    output: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    metadata: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
}, z.core.$strip>;
export type UpsertDatasetExamplePayload = z.infer<typeof UpsertDatasetExamplePayload>;
export declare const UpsertEvaluationDatasetRequestBody: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    examples: z.ZodArray<z.ZodObject<{
        input: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        output: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        metadata: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type UpsertEvaluationDatasetRequestBody = z.infer<typeof UpsertEvaluationDatasetRequestBody>;
export type UpsertEvaluationDatasetRequestBodyInput = z.input<typeof UpsertEvaluationDatasetRequestBody>;
export declare const UpsertEvaluationDatasetResponse: z.ZodObject<{
    dataset_id: z.ZodString;
    added: z.ZodNumber;
    removed: z.ZodNumber;
    unchanged: z.ZodNumber;
}, z.core.$strip>;
export type UpsertEvaluationDatasetResponse = z.infer<typeof UpsertEvaluationDatasetResponse>;
