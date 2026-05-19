import { z } from '@kbn/zod/v4';
export declare const DeleteEvaluationDatasetRequestParams: z.ZodObject<{
    datasetId: z.ZodString;
}, z.core.$strip>;
export type DeleteEvaluationDatasetRequestParams = z.infer<typeof DeleteEvaluationDatasetRequestParams>;
export type DeleteEvaluationDatasetRequestParamsInput = z.input<typeof DeleteEvaluationDatasetRequestParams>;
export declare const DeleteEvaluationDatasetResponse: z.ZodObject<{
    success: z.ZodBoolean;
}, z.core.$strip>;
export type DeleteEvaluationDatasetResponse = z.infer<typeof DeleteEvaluationDatasetResponse>;
