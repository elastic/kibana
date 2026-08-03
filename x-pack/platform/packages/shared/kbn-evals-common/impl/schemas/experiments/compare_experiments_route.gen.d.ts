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
export declare const CompareExperimentsRequestQuery: z.ZodObject<{
    type: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        execution: "execution";
        experiment: "experiment";
    }>>>;
    baseline_id: z.ZodString;
    target_id: z.ZodString;
}, z.core.$strip>;
export type CompareExperimentsRequestQuery = z.infer<typeof CompareExperimentsRequestQuery>;
export type CompareExperimentsRequestQueryInput = z.input<typeof CompareExperimentsRequestQuery>;
export declare const CompareExperimentsResponse: z.ZodObject<{
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
export type CompareExperimentsResponse = z.infer<typeof CompareExperimentsResponse>;
