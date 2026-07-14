export declare class BulkUpdateError extends Error {
    private _statusCode;
    private _type;
    constructor({ statusCode, message, type, }: {
        statusCode: number;
        message?: string;
        type: string;
    });
    get statusCode(): number;
    get type(): string;
}
export declare function getBulkUpdateStatusCode(error: Error | BulkUpdateError): number | undefined;
export declare function getBulkUpdateErrorType(error: Error | BulkUpdateError): string | undefined;
export declare function isClusterBlockException(error: Error | BulkUpdateError): boolean;
