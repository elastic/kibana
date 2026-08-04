/**
 * Time range definition for baseline and deviation to be used by log rate analysis.
 *
 * @export
 * @interface WindowParameters
 * @typedef {WindowParameters}
 */
export interface WindowParameters {
    /** Baseline minimum value */
    baselineMin: number;
    /** Baseline maximum value */
    baselineMax: number;
    /** Deviation minimum value */
    deviationMin: number;
    /** Deviation maximum value */
    deviationMax: number;
}
/**
 * Type guard for WindowParameters
 *
 * @param {unknown} arg - The argument to be checked.
 * @returns {arg is WindowParameters}
 */
export declare const isWindowParameters: (arg: unknown) => arg is WindowParameters;
