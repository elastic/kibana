export declare const isStringArray: (value: unknown) => value is string[];
export declare const isNonEmptyString: (value: unknown) => value is string;
export declare const toStringArray: (value: unknown) => string[];
/**
 * Normalizes a value to a string, string[], or undefined (empty values dropped).
 *
 * With `preserveArray`, an array input stays an array (even single-item) instead
 * of collapsing to a scalar — needed so alert/event `attachmentId`/`index`
 * round-trip to their stored shape (legacy POST arrives as arrays, PATCH as scalars).
 */
export declare const toStringOrStringArray: (value: unknown, { preserveArray }?: {
    preserveArray?: boolean;
}) => string | string[] | undefined;
/**
 * Returns the first non-empty string from the provided value (string or string[]),
 * or `null` when the value is nullish or contains only empty strings.
 */
export declare const getNonEmptyField: (field: unknown) => string | null;
