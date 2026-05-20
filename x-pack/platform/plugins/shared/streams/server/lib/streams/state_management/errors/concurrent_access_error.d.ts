import { StatusError } from '../../errors/status_error';
export declare class ConcurrentAccessError extends StatusError {
    constructor(message: string);
}
