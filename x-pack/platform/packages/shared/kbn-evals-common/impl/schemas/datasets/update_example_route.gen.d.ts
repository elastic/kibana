import { z } from '@kbn/zod/v4';
export declare const UpdateExamplePayload: z.ZodObject<{
    input: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    output: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    metadata: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
}, z.core.$strip>;
export type UpdateExamplePayload = z.infer<typeof UpdateExamplePayload>;
export declare const UpdateEvaluationDatasetExampleRequestParams: z.ZodObject<{
    datasetId: z.ZodString;
    exampleId: z.ZodString;
}, z.core.$strip>;
export type UpdateEvaluationDatasetExampleRequestParams = z.infer<typeof UpdateEvaluationDatasetExampleRequestParams>;
export type UpdateEvaluationDatasetExampleRequestParamsInput = z.input<typeof UpdateEvaluationDatasetExampleRequestParams>;
export declare const UpdateEvaluationDatasetExampleRequestBody: z.ZodObject<{
    input: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    output: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    metadata: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
}, z.core.$strip>;
export type UpdateEvaluationDatasetExampleRequestBody = z.infer<typeof UpdateEvaluationDatasetExampleRequestBody>;
export type UpdateEvaluationDatasetExampleRequestBodyInput = z.input<typeof UpdateEvaluationDatasetExampleRequestBody>;
export declare const UpdateEvaluationDatasetExampleResponse: z.ZodObject<{
    id: z.ZodString;
    dataset_id: z.ZodString;
    input: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    output: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    metadata: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, z.core.$strip>;
export type UpdateEvaluationDatasetExampleResponse = z.infer<typeof UpdateEvaluationDatasetExampleResponse>;
