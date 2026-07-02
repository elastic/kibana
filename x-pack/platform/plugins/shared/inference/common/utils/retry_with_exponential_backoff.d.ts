/**
 * Returns an operator that retries the source observable with exponential backoff,
 * but only for errors that match the provided filter.
 *
 * @param maxRetry - Maximum number of retry attempts. Defaults to 3.
 * @param initialDelay - The delay in milliseconds before the first retry. Defaults to 1000.
 * @param backoffMultiplier - Factor by which the delay increases each time. Defaults to 2.
 * @param errorFilter - Function to decide whether an error is eligible for a retry. Defaults to retrying any error.
 */
export declare function retryWithExponentialBackoff<T>({ maxRetry, initialDelay, backoffMultiplier, errorFilter, }: {
    maxRetry?: number;
    initialDelay?: number;
    backoffMultiplier?: number;
    errorFilter?: (error: Error) => boolean;
}): import("rxjs").MonoTypeOperatorFunction<T>;
