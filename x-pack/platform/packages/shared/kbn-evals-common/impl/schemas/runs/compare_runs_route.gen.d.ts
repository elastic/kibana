import { z } from '@kbn/zod/v4';
export declare const PairedTTestResult: z.ZodObject<{
    datasetId: z.ZodString;
    datasetName: z.ZodString;
    evaluatorName: z.ZodString;
    sampleSize: z.ZodNumber;
    meanA: z.ZodNumber;
    meanB: z.ZodNumber;
    pValue: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>;
export type PairedTTestResult = z.infer<typeof PairedTTestResult>;
export declare const CompareRunsRequestQuery: z.ZodObject<{
    run_id_a: z.ZodString;
    run_id_b: z.ZodString;
}, z.core.$strip>;
export type CompareRunsRequestQuery = z.infer<typeof CompareRunsRequestQuery>;
export type CompareRunsRequestQueryInput = z.input<typeof CompareRunsRequestQuery>;
export declare const CompareRunsResponse: z.ZodObject<{
    results: z.ZodArray<z.ZodObject<{
        datasetId: z.ZodString;
        datasetName: z.ZodString;
        evaluatorName: z.ZodString;
        sampleSize: z.ZodNumber;
        meanA: z.ZodNumber;
        meanB: z.ZodNumber;
        pValue: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>>;
    pairing: z.ZodObject<{
        totalPairs: z.ZodNumber;
        skippedMissingPairs: z.ZodNumber;
        skippedNullScores: z.ZodNumber;
        truncatedA: z.ZodBoolean;
        truncatedB: z.ZodBoolean;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CompareRunsResponse = z.infer<typeof CompareRunsResponse>;
