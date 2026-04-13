import type { ApiErrorResponse } from './fetch_options';
export declare class DatasetQualityError extends Error {
    readonly statusCode?: number;
    readonly originalMessage?: string;
    constructor(message: string, originalError?: ApiErrorResponse);
}
