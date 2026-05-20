import { StatusError } from './status_error';
export declare class FailureStoreNotEnabledError extends StatusError {
    constructor(message: string);
}
export declare function isFailureStoreNotEnabledError(error: unknown): error is FailureStoreNotEnabledError;
