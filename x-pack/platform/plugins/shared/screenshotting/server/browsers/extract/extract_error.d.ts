export declare class ExtractError extends Error {
    readonly cause: Error;
    constructor(cause: Error, message?: string);
}
