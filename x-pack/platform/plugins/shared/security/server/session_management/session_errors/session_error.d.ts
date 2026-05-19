export declare enum SessionErrorReason {
    'SESSION_MISSING' = "SESSION_MISSING",
    'SESSION_EXPIRED' = "SESSION_EXPIRED",
    'SESSION_IDLE_TIMEOUT' = "SESSION_IDLE_TIMEOUT",
    'SESSION_LIFESPAN_TIMEOUT' = "SESSION_LIFESPAN_TIMEOUT",
    'CONCURRENCY_LIMIT' = "CONCURRENCY_LIMIT",
    'UNEXPECTED_SESSION_ERROR' = "UNEXPECTED_SESSION_ERROR"
}
export declare class SessionError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
