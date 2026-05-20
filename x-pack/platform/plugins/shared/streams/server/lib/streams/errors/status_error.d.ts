export declare class StatusError extends Error {
    readonly statusCode: number;
    /**
     * Optional data that can be included with the error. It will be attached
     * to the response as `attributes.data`.
     */
    data?: unknown;
    constructor(message: string, statusCode: number);
}
