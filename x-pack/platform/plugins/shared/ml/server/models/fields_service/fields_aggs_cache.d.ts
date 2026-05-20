/**
 * Cached aggregation types
 */
type AggType = 'overallCardinality' | 'maxBucketCardinality';
type CacheStorage = {
    [key in AggType]: {
        [field: string]: number;
    };
};
/**
 * Caches cardinality fields values to avoid
 * unnecessary aggregations on elasticsearch
 */
export declare const initCardinalityFieldsCache: () => {
    /**
     * Gets requested values from cache
     */
    getValues(indexPatternName: string | string[], timeField: string, earliestMs: number, latestMs: number, aggType: AggType, fieldNames: string[]): CacheStorage[AggType] | null;
    /**
     * Extends cache with provided values
     */
    updateValues(indexPatternName: string | string[], timeField: string, earliestMs: number, latestMs: number, update: Partial<CacheStorage>): void;
};
export {};
