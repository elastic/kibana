export declare class AggregateStatusError extends AggregateError {
    readonly statusCode: number;
    constructor(errors: Error[], message: string, statusCode: number);
}
