import { StatusError } from '../../errors/status_error';
export declare class FailedToApplyRequestedChangesError extends StatusError {
    constructor(message: string, statusCode: number | undefined);
}
