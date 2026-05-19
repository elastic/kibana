import { z } from '@kbn/zod/v4';
export declare const UpdateEvaluationDatasetRequestParams: z.ZodObject<{
    datasetId: z.ZodString;
}, z.core.$strip>;
export type UpdateEvaluationDatasetRequestParams = z.infer<typeof UpdateEvaluationDatasetRequestParams>;
export type UpdateEvaluationDatasetRequestParamsInput = z.input<typeof UpdateEvaluationDatasetRequestParams>;
export declare const UpdateEvaluationDatasetRequestBody: z.ZodObject<{
    description: z.ZodString;
}, z.core.$strip>;
export type UpdateEvaluationDatasetRequestBody = z.infer<typeof UpdateEvaluationDatasetRequestBody>;
export type UpdateEvaluationDatasetRequestBodyInput = z.input<typeof UpdateEvaluationDatasetRequestBody>;
export declare const UpdateEvaluationDatasetResponse: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, z.core.$strip>;
export type UpdateEvaluationDatasetResponse = z.infer<typeof UpdateEvaluationDatasetResponse>;
