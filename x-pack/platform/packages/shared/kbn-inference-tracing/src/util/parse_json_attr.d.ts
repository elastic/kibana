/**
 * Safely parse a JSON attribute value.
 * Returns undefined if the value is not a string or if JSON parsing fails.
 * This prevents exceptions from malformed attributes from propagating.
 */
export declare function parseJsonAttr<T>(value: unknown): T | undefined;
