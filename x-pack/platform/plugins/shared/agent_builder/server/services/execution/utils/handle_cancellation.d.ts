import type { OperatorFunction } from 'rxjs';
/**
 * Handles cancellation by unsubscribing to the observable and emitting an error if the request is aborted.
 * @param abortSignal The abort signal to listen to for cancellation.
 */
export declare function handleCancellation<T>(abortSignal?: AbortSignal): OperatorFunction<T, T>;
