interface FormWithFields {
    getFields: () => Record<string, {
        value: unknown;
    } | undefined>;
}
export interface GetPhaseDurationMsConfig {
    /**
     * Suffix under `_meta.<phase>.` containing the numeric value.
     * Examples:
     * - `minAgeValue`
     * - `downsample.fixedIntervalValue`
     */
    valuePathSuffix: string;
    /**
     * Suffix under `_meta.<phase>.` containing the unit.
     * Examples:
     * - `minAgeUnit`
     * - `downsample.fixedIntervalUnit`
     */
    unitPathSuffix: string;
    /**
     * Optional suffix under `_meta.<phase>.` that must be `true` for the duration to be considered.
     * Example:
     * - `downsampleEnabled`
     */
    extraEnabledPathSuffix?: string;
}
export declare const getPhaseDurationMs: <Phase extends string>(form: FormWithFields, phase: Phase, { valuePathSuffix, unitPathSuffix, extraEnabledPathSuffix }: GetPhaseDurationMsConfig) => number | null;
export {};
