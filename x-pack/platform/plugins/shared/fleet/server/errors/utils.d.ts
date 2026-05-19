import { errors } from '@elastic/elasticsearch';
export declare function isESClientError(error: unknown): error is errors.ResponseError;
export declare function isElasticsearchVersionConflictError(error: Error): boolean;
interface CatchAndSetErrorStackTrace {
    (error: Error, message?: string): Promise<never>;
    /**
     * Adds a message to the stack trace of the error whose stack trace will be updated.
     * Use it to further include info. for debugging purposes
     */
    withMessage(message: string): (error: Error) => Promise<never>;
}
/**
 * Error handling utility for use with promises that will set the stack trace on the error provided.
 * Especially useful when working with ES/SO client, as errors thrown by those client normally do
 * not include a very helpful stack trace.
 *
 * @param error
 * @param message
 *
 * @example
 *
 *    esClient.search(...).catch(catchAndSetErrorStackTrace);
 *
 *    // With custom message on error thrown
 *    esClient.search(...).catch(catchAndSetErrorStackTrace.withMessage('update to item xyz failed'));
 *
 */
export declare const catchAndSetErrorStackTrace: CatchAndSetErrorStackTrace;
/**
 * Re-throws an error, preserving the original error if it's already an instance of the target error class,
 * or wrapping it in the target error class if it's not.
 *
 * This prevents double-wrapping errors while ensuring consistent error types.
 *
 * @param error - The error to re-throw
 * @param ErrorClass - The error class constructor to use for wrapping
 * @param message - Optional custom message for the wrapped error
 *
 * @example
 * try {
 *   // some operation
 * } catch (error) {
 *   rethrowIfInstanceOrWrap(error, CloudConnectorCreateError, 'Failed to create cloud connector');
 * }
 */
/**
 * Extracts a string message from an unknown error value.
 * Returns the error's message if it's an Error instance, otherwise converts to string.
 *
 * @param error - The error value to extract a message from
 * @returns The error message as a string
 */
export declare function getErrorMessage(error: unknown): string;
export declare function rethrowIfInstanceOrWrap<T extends new (message: string) => Error>(error: unknown, ErrorClass: T, message?: string): never;
export {};
