import { StatusError } from './status_error';
export declare class SecurityError extends StatusError {
    constructor(message: string, options?: {
        cause?: Error;
    });
}
