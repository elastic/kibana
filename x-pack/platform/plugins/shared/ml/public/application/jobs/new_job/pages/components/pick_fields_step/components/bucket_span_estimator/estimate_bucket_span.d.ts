export declare enum ESTIMATE_STATUS {
    NOT_RUNNING = 0,
    RUNNING = 1
}
export declare function useEstimateBucketSpan(): {
    status: ESTIMATE_STATUS;
    estimateBucketSpan: () => Promise<void>;
};
