import { ServerSentEventError } from '@kbn/sse-utils';
import type { InferenceTaskEventBase, InferenceTaskEventType } from './inference_task';
/**
 * Enum for generic inference error codes.
 */
export declare enum InferenceTaskErrorCode {
    providerError = "providerError",
    internalError = "internalError",
    requestError = "requestError",
    abortedError = "requestAborted"
}
declare const InferenceTaskError: typeof ServerSentEventError;
type InferenceTaskError<TCode extends string, TMeta extends Record<string, any> | undefined> = ServerSentEventError<TCode, TMeta>;
export type InferenceTaskErrorEvent = InferenceTaskEventBase<InferenceTaskEventType.error, {
    error: {
        code: string;
        message: string;
        meta?: Record<string, any>;
    };
}>;
/**
 * Inference error thrown when an unexpected internal error occurs while handling the request.
 */
export type InferenceTaskInternalError = InferenceTaskError<InferenceTaskErrorCode.internalError, Record<string, any>>;
/**
 * Inference error thrown when calling the provider through its connector returned an error.
 *
 * It includes error responses returned from the provider,
 * and any potential errors related to connectivity issue.
 */
export type InferenceTaskProviderError = InferenceTaskError<InferenceTaskErrorCode.providerError, {
    status?: number;
}>;
/**
 * Inference error thrown when the request was considered invalid.
 *
 * Some example of reasons for invalid requests would be:
 * - no connector matching the provided connectorId
 * - invalid connector type for the provided connectorId
 */
export type InferenceTaskRequestError = InferenceTaskError<InferenceTaskErrorCode.requestError, {
    status: number;
}>;
/**
 * Inference error thrown when the request was aborted.
 *
 * Request abortion occurs when providing an abort signal and firing it
 * before the call to the LLM completes.
 */
export type InferenceTaskAbortedError = InferenceTaskError<InferenceTaskErrorCode.abortedError, {
    status: number;
}>;
export declare function createInferenceInternalError(message?: string, meta?: Record<string, any>): InferenceTaskInternalError;
export declare function createInferenceProviderError(message?: string, meta?: {
    status?: number;
}): InferenceTaskProviderError;
export declare function createInferenceRequestError(message: string, status: number): InferenceTaskRequestError;
export declare function createInferenceRequestAbortedError(): InferenceTaskAbortedError;
/**
 * Check if the given error is an {@link InferenceTaskError}
 */
export declare function isInferenceError(error: unknown): error is InferenceTaskError<string, Record<string, any> | undefined>;
/**
 * Check if the given error is an {@link InferenceTaskInternalError}
 */
export declare function isInferenceInternalError(error: unknown): error is InferenceTaskInternalError;
/**
 * Check if the given error is an {@link InferenceTaskRequestError}
 */
export declare function isInferenceRequestError(error: unknown): error is InferenceTaskRequestError;
/**
 * Check if the given error is an {@link InferenceTaskAbortedError}
 */
export declare function isInferenceRequestAbortedError(error: unknown): error is InferenceTaskAbortedError;
/**
 * Check if the given error is an {@link InferenceTaskProviderError}
 */
export declare function isInferenceProviderError(error: unknown): error is InferenceTaskProviderError;
export { InferenceTaskError };
