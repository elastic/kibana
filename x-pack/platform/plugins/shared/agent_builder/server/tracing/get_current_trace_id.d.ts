/**
 * Returns the current traceId (which can be used to check traces in phoenix.
 *
 * **MUST* be called from within an active trace
 */
export declare const getCurrentTraceId: () => string | undefined;
