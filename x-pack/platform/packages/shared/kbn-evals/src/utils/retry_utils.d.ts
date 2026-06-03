export interface RetryOptions {
    /**
     * Total number of attempts (initial try + retries).
     */
    maxAttempts?: number;
    /**
     * Minimum delay for exponential backoff (ms).
     */
    minDelayMs?: number;
    /**
     * Maximum delay cap (ms).
     */
    maxDelayMs?: number;
    /**
     * If true, add a small random jitter to the delay.
     */
    jitter?: boolean;
    /**
     * Optional label for error messages/logging.
     */
    label?: string;
    /**
     * Optional hook invoked before sleeping between retries.
     */
    onRetry?: (params: {
        attempt: number;
        maxAttempts: number;
        delayMs: number;
        error: unknown;
        label: string;
    }) => void;
}
export declare function getStatusCode(error: any): number | undefined;
/**
 * Retry a promise-returning function with exponential backoff.
 *
 * This is intended for evals/test-call sites (e.g. `kbnClient.request`) where we don't
 * reliably have access to response headers and may only have an error message string.
 */
export declare function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
