/**
 * Parsed error information extracted from unknown caught errors.
 * This provides a unified interface for handling errors across the codebase,
 * particularly useful for Elasticsearch ResponseError and standard Error types.
 */
export interface ParsedError {
    /** The error message */
    message: string;
    /** The error type from Elasticsearch (e.g., 'security_exception', 'resource_already_exists_exception') */
    type?: string;
    /** HTTP status code from Elasticsearch ResponseError */
    statusCode?: number;
    /** The original error for chaining/debugging */
    cause: unknown;
}
/**
 * Parses an unknown caught error and extracts standardized error information.
 *
 * This utility provides type-safe extraction of error details from:
 * - Elasticsearch ResponseError: extracts message, statusCode, and error type from body
 * - Standard Error: extracts message
 * - Other values: converts to string for message
 *
 * @example
 * ```ts
 * try {
 *   await esClient.indices.createDataStream({ name });
 * } catch (error) {
 *   const { message, type, statusCode } = parseError(error);
 *   if (type === 'resource_already_exists_exception') {
 *     // Handle already exists case
 *   }
 *   if (statusCode === 404) {
 *     // Handle not found case
 *   }
 * }
 * ```
 */
export declare function parseError(error: unknown): ParsedError;
/**
 * Convenience function to get just the error message from an unknown error.
 * This is a simpler alternative to parseError when only the message is needed.
 *
 * @deprecated Prefer using parseError() for more complete error information
 */
export declare function getErrorMessage(error: unknown): string;
