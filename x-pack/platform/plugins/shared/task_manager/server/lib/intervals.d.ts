export declare enum IntervalCadence {
    Minute = "m",
    Second = "s",
    Hour = "h",
    Day = "d"
}
export type Interval = string;
export declare function isInterval(interval: Interval | string): interval is Interval;
export declare function asInterval(ms: number): Interval;
/**
 * Returns a date that is the specified interval from now. Currently,
 * only minute-intervals and second-intervals are supported.
 *
 * @param {Interval} interval - An interval of the form `Nm` such as `5m`
 */
export declare function intervalFromNow(interval?: Interval): Date | undefined;
/**
 * Returns a date that is the specified interval from given date. Currently,
 * only minute-intervals and second-intervals are supported.
 *
 * @param {Date} date - The date to add interval to
 * @param {Interval} interval - An interval of the form `Nm` such as `5m`
 */
export declare function intervalFromDate(date: Date, interval?: Interval): Date | undefined;
export declare function maxIntervalFromDate(date: Date, ...intervals: Array<Interval | undefined>): Date | undefined;
/**
 * Returns a date that is secs seconds from now.
 *
 * @param secs The number of seconds from now
 */
export declare function secondsFromNow(secs: number): Date;
/**
 * Returns a date that is secs seconds from given date.
 *
 * @param date The date to add seconds to
 * @param secs The number of seconds from given date
 */
export declare function secondsFromDate(date: Date, secs: number): Date;
/**
 * Verifies that the specified interval matches our expected format.
 *
 * @param {Interval} interval - An interval such as `5m` or `10s`
 * @returns {number} The interval as seconds
 */
export declare const parseIntervalAsSecond: ((interval: Interval) => number) & import("lodash").MemoizedFunction;
export declare const parseIntervalAsMillisecond: ((interval: Interval) => number) & import("lodash").MemoizedFunction;
export declare const timePeriodBeforeDate: (date: Date, timePeriod: string) => Date;
