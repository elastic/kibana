/**
 * Represents the result of number validation.
 * @interface
 */
export type NumberValidationResult = {
    [key: string]: boolean;
} & {
    /** The minimum allowed value. */
    min?: boolean;
    /** The maximum allowed value. */
    max?: boolean;
    /** Boolean flag to allow integer values only. */
    integerOnly?: boolean;
};
/**
 * An interface describing conditions for validating numbers.
 * @interface
 */
interface NumberValidatorConditions {
    /**
     * The minimum value for validation.
     */
    min?: number;
    /**
     * The maximum value for validation.
     */
    max?: number;
    /**
     * Indicates whether only integer values are valid.
     */
    integerOnly?: boolean;
    required?: boolean;
}
/**
 * Validate if a number is within specified minimum and maximum bounds.
 *
 * @param conditions - An optional object containing validation conditions.
 * @returns validation results.
 * @throws {Error} If the provided conditions are invalid (min is greater than max).
 */
export declare function numberValidator(conditions?: NumberValidatorConditions): ((value: number | undefined) => NumberValidationResult | null) & import("lodash").MemoizedFunction;
export {};
