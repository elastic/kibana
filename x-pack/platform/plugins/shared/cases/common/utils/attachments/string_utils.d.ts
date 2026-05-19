export declare const isStringArray: (value: unknown) => value is string[];
export declare const isNonEmptyString: (value: unknown) => value is string;
export declare const toStringArray: (value: unknown) => string[];
export declare const toStringOrStringArray: (value: unknown) => string | string[] | undefined;
/**
 * Returns the first non-empty string from the provided value (string or string[]),
 * or `null` when the value is nullish or contains only empty strings.
 */
export declare const getNonEmptyField: (field: unknown) => string | null;
