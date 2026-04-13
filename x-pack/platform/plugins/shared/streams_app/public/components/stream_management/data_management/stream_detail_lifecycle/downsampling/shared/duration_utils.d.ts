import type { PreservedTimeUnit } from './time_unit_types';
export interface DoubledDurationResult {
    value: string;
    unit: PreservedTimeUnit;
    ms: number;
}
export interface GetDoubledDurationFromPreviousOptions {
    /** Defaults to 2. */
    readonly multiplier?: number;
    /** Fallback used when `previousValue` is missing/invalid. */
    readonly previousValueFallback: number;
    /** Inclusive minimum for the previous numeric value. */
    readonly previousValueMinInclusive?: number;
    /** Exclusive minimum for the previous numeric value. */
    readonly previousValueMinExclusive?: number;
}
export declare const toMilliseconds: (value: string, unit: PreservedTimeUnit) => number;
export declare const getDoubledDurationFromPrevious: ({ previousValue, previousUnit, multiplier, previousValueFallback, previousValueMinInclusive, previousValueMinExclusive, }: {
    previousValue: string;
    previousUnit: PreservedTimeUnit;
} & GetDoubledDurationFromPreviousOptions) => DoubledDurationResult;
export declare const parseInterval: (duration: string | undefined) => {
    value: string;
    unit: PreservedTimeUnit;
} | undefined;
export declare const formatMillisecondsInUnit: (ms: number, unit: PreservedTimeUnit, precision?: number) => string;
