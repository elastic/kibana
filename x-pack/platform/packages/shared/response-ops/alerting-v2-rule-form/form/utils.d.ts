import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
type TimeUnit = 's' | 'm' | 'h' | 'd';
export declare const POSITIVE_INTEGER_REGEX: RegExp;
export declare const INVALID_NUMBER_KEYS: string[];
/**
 * Build the time-unit options for a duration input. When `minDurationMs` is
 * provided, units smaller than the largest unit that still fits within the
 * minimum are hidden (e.g. "seconds" disappears once the minimum is `1m`), while
 * a sub-minute minimum (e.g. `5s`) keeps every unit available.
 */
export declare const getTimeOptions: (val?: number, minDurationMs?: number) => {
    value: TimeUnit;
    text: string;
}[];
export declare const getDurationUnitValue: (duration: string) => TimeUnit;
export declare const getDurationNumberInItsUnit: (duration: string) => number;
/** Returns true for `date`, `date_nanos`, and `datetime` field types. */
export declare const isDateLikeFieldType: (type: string) => boolean;
export declare const getTimeFieldOptions: (fields: DataViewFieldMap) => Array<{
    text: string;
    value: string;
}>;
export declare const firstFieldOption: {
    text: string;
    value: string;
};
export declare const parseDuration: (duration: string) => number;
export declare const formatDuration: (duration: number, short?: boolean) => string;
export {};
