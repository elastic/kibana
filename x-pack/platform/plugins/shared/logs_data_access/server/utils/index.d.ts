export declare function getBucketSizeFromTimeRangeAndBucketCount(timeFrom: number, timeTo: number, numBuckets: number): number;
export declare function getLogRatePerMinute({ logCount, timeFrom, timeTo, }: {
    logCount: number;
    timeFrom: number;
    timeTo: number;
}): number;
export declare function getLogErrorRate({ logCount, logErrorCount, }: {
    logCount: number;
    logErrorCount?: number;
}): number;
