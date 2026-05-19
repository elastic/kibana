import { z } from '@kbn/zod/v4';
export declare const DeleteEvaluationDatasetExampleRequestParams: z.ZodObject<{
    datasetId: z.ZodString;
    exampleId: z.ZodString;
}, z.core.$strip>;
export type DeleteEvaluationDatasetExampleRequestParams = z.infer<typeof DeleteEvaluationDatasetExampleRequestParams>;
export type DeleteEvaluationDatasetExampleRequestParamsInput = z.input<typeof DeleteEvaluationDatasetExampleRequestParams>;
export declare const DeleteEvaluationDatasetExampleResponse: z.ZodObject<{
    success: z.ZodBoolean;
}, z.core.$strip>;
export type DeleteEvaluationDatasetExampleResponse = z.infer<typeof DeleteEvaluationDatasetExampleResponse>;
