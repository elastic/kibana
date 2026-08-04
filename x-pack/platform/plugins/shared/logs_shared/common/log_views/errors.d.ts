export declare class ResolveLogViewError extends Error {
    cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
export declare class FetchLogViewError extends Error {
    cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
export declare class FetchLogViewStatusError extends Error {
    cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
export declare class PutLogViewError extends Error {
    cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
