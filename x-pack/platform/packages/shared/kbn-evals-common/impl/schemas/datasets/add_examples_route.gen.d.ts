import { z } from '@kbn/zod/v4';
export declare const AddExamplesPayload: z.ZodObject<{
    input: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    output: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    metadata: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
}, z.core.$strip>;
export type AddExamplesPayload = z.infer<typeof AddExamplesPayload>;
export declare const AddEvaluationDatasetExamplesRequestParams: z.ZodObject<{
    datasetId: z.ZodString;
}, z.core.$strip>;
export type AddEvaluationDatasetExamplesRequestParams = z.infer<typeof AddEvaluationDatasetExamplesRequestParams>;
export type AddEvaluationDatasetExamplesRequestParamsInput = z.input<typeof AddEvaluationDatasetExamplesRequestParams>;
export declare const AddEvaluationDatasetExamplesRequestBody: z.ZodObject<{
    examples: z.ZodArray<z.ZodObject<{
        input: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        output: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        metadata: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type AddEvaluationDatasetExamplesRequestBody = z.infer<typeof AddEvaluationDatasetExamplesRequestBody>;
export type AddEvaluationDatasetExamplesRequestBodyInput = z.input<typeof AddEvaluationDatasetExamplesRequestBody>;
export declare const AddEvaluationDatasetExamplesResponse: z.ZodObject<{
    added: z.ZodNumber;
}, z.core.$strip>;
export type AddEvaluationDatasetExamplesResponse = z.infer<typeof AddEvaluationDatasetExamplesResponse>;
