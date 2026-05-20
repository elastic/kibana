import type { TimeRange } from '@kbn/es-query';
/**
 * Format a timestamp as human readable date.
 *
 * @param {number} ts - The timestamp to be formatted.
 * @returns {string}
 */
export declare function formatHumanReadableDate(ts: number): string;
/**
 * Format a timestamp as human readable date including hours and minutes.
 *
 * @param {number} ts - The timestamp to be formatted.
 * @returns {string}
 */
export declare function formatHumanReadableDateTime(ts: number): string;
/**
 * Format a timestamp as human readable date including hours, minutes and seconds.
 *
 * @param {number} ts - The timestamp to be formatted.
 * @returns {string}
 */
export declare function formatHumanReadableDateTimeSeconds(ts: number): string;
/**
 * Validate a time range of two string based dates.
 * Copy of `src/platform/plugins/shared/data/public/query/timefilter/lib/validate_timerange.ts`
 * for the time being so it can be used in packages.
 *
 * @param {?TimeRange} [time] - The time range to be validated.
 * @returns {boolean}
 */
export declare function validateTimeRange(time?: TimeRange): boolean;
/**
 * Transform a string based time range into one based on timestamps.
 *
 * @param {TimeRange} time - The time range to be transformed.
 * @returns {{ to: any; from: any; }}
 */
export declare function createAbsoluteTimeRange(time: TimeRange): {
    to: number | undefined;
    from: number | undefined;
} | null;
/**
 * Format a timestamp into a human readable date based on the `TIME_FORMAT` spec.
 *
 * @param {number} value - The timestamp to be formatted.
 * @returns {string}
 */
export declare const timeFormatter: (value: number) => string;
