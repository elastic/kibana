import { z } from '@kbn/zod/v4';
export declare const DatasetSummary: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    examples_count: z.ZodNumber;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, z.core.$strip>;
export type DatasetSummary = z.infer<typeof DatasetSummary>;
export declare const GetEvaluationDatasetsRequestQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    per_page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
export type GetEvaluationDatasetsRequestQuery = z.infer<typeof GetEvaluationDatasetsRequestQuery>;
export type GetEvaluationDatasetsRequestQueryInput = z.input<typeof GetEvaluationDatasetsRequestQuery>;
export declare const GetEvaluationDatasetsResponse: z.ZodObject<{
    datasets: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        examples_count: z.ZodNumber;
        created_at: z.ZodString;
        updated_at: z.ZodString;
    }, z.core.$strip>>;
    total: z.ZodNumber;
}, z.core.$strip>;
export type GetEvaluationDatasetsResponse = z.infer<typeof GetEvaluationDatasetsResponse>;
