/**
 * Thrown when a list query asks for a window larger than the index's
 * `index.max_result_window` setting. Routes translate this to HTTP 400 so
 * callers see a clean error instead of a 500.
 */
export declare class SmlResultWindowExceededError extends Error {
    constructor(message: string);
}
