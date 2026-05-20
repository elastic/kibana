import type { SampleDoc } from './get_sample_docs';
export interface SamplingStats {
    /** number of sample documents which were used for those stats */
    sampleCount: number;
    /** per-field stats based on the samples */
    fieldStats: Record<string, FieldStats>;
}
export interface FieldStats {
    /** number of sampling documents having at least one value */
    filledDocCount: number;
    /** number of sampling documents not having any value */
    emptyDocCount: number;
    /** values with count, sorted by count desc */
    values: FieldValueWithCount[];
}
export interface FieldValueWithCount {
    value: number | string | boolean;
    count: number;
}
export declare const createStatsFromSamples: ({ samples }: {
    samples: SampleDoc[];
}) => SamplingStats;
