/**
 * Generates an array of timestamps evenly spaced within a given time range.
 *
 * @param timeRangeEarliest The earliest timestamp in the time range.
 * @param timeRangeLatest The latest timestamp in the time range.
 * @param interval The interval between timestamps in milliseconds.
 * @returns Array of timestamps spaced by the specified interval within the given range.
 */
export declare const getSnappedTimestamps: (timeRangeEarliest: number, timeRangeLatest: number, interval: number) => number[];
