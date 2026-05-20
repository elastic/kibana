export declare class PollTimeoutError extends Error {
    constructor(message: string);
}
interface PollUntilOptions {
    intervalMs?: number;
    maxAttempts?: number;
}
/**
 * Repeatedly calls `fn` until it returns a value that satisfies `predicate`,
 * waiting `intervalMs` between each attempt. Throws a `PollTimeoutError`
 * after `maxAttempts` unsuccessful polls.
 */
export declare const pollUntil: <T>(fn: () => Promise<T>, predicate: (value: T) => boolean, { intervalMs, maxAttempts }?: PollUntilOptions) => Promise<T>;
export {};
