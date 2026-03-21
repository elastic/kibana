/**
 * Normalize error type/code from error object
 * @param error - Error object
 */
export declare function normalizeErrorType(error: unknown): string;
/**
 * Extract the AgentExecutionErrorCode sub-type from an agentExecutionError.
 * Returns undefined if the error is not an agentExecutionError or doesn't have a sub-code.
 * @param error - Error object
 */
export declare function getAgentExecutionErrorCode(error: unknown): string | undefined;
/**
 * Sanitize text for use in counter names
 * Counter names must be valid identifiers and cannot contain special characters
 * @param text - Text to sanitize
 * @returns Sanitized text safe for counter names
 */
export declare function sanitizeForCounterName(text: string): string;
