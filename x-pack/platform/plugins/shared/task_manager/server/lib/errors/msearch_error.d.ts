export declare class MsearchError extends Error {
    private _statusCode?;
    constructor(statusCode?: number);
    get statusCode(): number | undefined;
}
export declare function getMsearchStatusCode(error: Error | MsearchError): number | undefined;
