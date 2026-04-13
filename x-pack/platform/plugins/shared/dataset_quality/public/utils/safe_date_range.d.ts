/**
 * Safely gets the date range in ISO format.
 * Returns undefined if the date range is invalid (e.g., start > end).
 *
 * This can happen with edge cases like:
 * - Relative dates that evaluate to invalid ranges (e.g., `from: now-51s` with an absolute `to` date in the past)
 * - Invalid date strings
 *
 * @param timeRange - The time range with from/to strings
 * @returns The date range in ISO format, or undefined if invalid
 */
export declare const getSafeDateISORange: (timeRange: {
    from: string;
    to: string;
}) => {
    startDate: string;
    endDate: string;
} | undefined;
