/**
 * Calculates and returns an extended change point range based on the specified change point timestamp.
 *
 * @param buckets - An object where keys are bucket timestamps as strings
 *                  and values are numeric values associated with each bucket.
 * @param changePointTs - The timestamp of the change point as a number. This timestamp must
 *                        be one of the keys in the `buckets` object.
 * @returns An object containing two properties: `startTs` and `endTs`.
 */
export declare const getExtendedChangePoint: (buckets: Record<string, number>, changePointTs: number) => {
    startTs: number;
    endTs: number;
};
