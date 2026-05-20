/**
 * Provides a validator function for maximum allowed input length.
 * @param maxLength Maximum length allowed.
 */
export declare function maxLengthValidator(maxLength: number): (value: string) => {
    maxLength: {
        requiredLength: number;
        actualLength: number;
    };
} | null;
/**
 * Factory that provides a validator function for checking against pattern.
 * @param pattern Pattern to check against.
 * @returns A validator function that checks if the value matches the pattern.
 */
export declare function patternValidator(pattern: RegExp): (value: string) => {
    pattern: {
        matchPattern: string;
    };
} | null;
/**
 * Factory that composes multiple validators into a single function.
 *
 * @param validators List of validators to compose.
 * @returns A validator function that runs all the validators.
 */
export declare function composeValidators(...validators: Array<(value: any) => {
    [key: string]: any;
} | null>): (value: any) => {
    [key: string]: any;
} | null;
/**
 * Factory to create a required validator function.
 * @returns A validator function that checks if the value is empty.
 */
export declare function requiredValidator(): <T extends string>(value: T) => {
    required: boolean;
} | null;
/**
 * Type for the result of a validation.
 */
export type ValidationResult = Record<string, any> | null;
/**
 * Type for the result of a memory input validation.
 */
export type MemoryInputValidatorResult = {
    invalidUnits: {
        allowedUnits: string;
    };
} | null;
/**
 * Factory for creating a memory input validator function.
 *
 * @param allowedUnits Allowed units for the memory input.
 * @returns A validator function that checks if the value is a valid memory input.
 */
export declare function memoryInputValidator(allowedUnits?: string[]): <T>(value: T) => {
    invalidUnits: {
        allowedUnits: string;
    };
} | null;
/**
 * Factory for creating a time interval input validator function.
 *
 * @returns A validator function that checks if the value is a valid time interval.
 */
export declare function timeIntervalInputValidator(): (value: string) => {
    invalidTimeInterval: boolean;
} | null;
/**
 * Factory to create a dictionary validator function.
 * @param dict Dictionary to check against.
 * @param shouldInclude Whether the value should be included in the dictionary.
 * @returns A validator function that checks if the value is in the dictionary.
 */
export declare function dictionaryValidator(dict: string[], shouldInclude?: boolean): (value: string) => {
    matchDict: string;
} | null;
