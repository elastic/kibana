interface RequestAbortedError extends Error {
    name: 'RequestAbortedError';
}
export declare function isRequestAbortedError(arg: unknown): arg is RequestAbortedError;
export {};
