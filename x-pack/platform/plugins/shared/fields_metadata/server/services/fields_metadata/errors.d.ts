export declare class PackageNotFoundError extends Error {
    cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
