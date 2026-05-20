import { StatusError } from '../../errors/status_error';
export declare class FailedToChangeStateError extends StatusError {
    constructor(message: string, statusCode: number);
}
