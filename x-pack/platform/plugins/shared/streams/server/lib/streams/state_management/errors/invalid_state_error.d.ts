import { AggregateStatusError } from '../../errors/aggregate_status_error';
export declare class InvalidStateError extends AggregateStatusError {
    constructor(errors: Error[], message: string);
}
