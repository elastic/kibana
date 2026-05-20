import { StatusError } from './status_error';
export declare class DefinitionNotFoundError extends StatusError {
    constructor(message: string);
}
export declare function isDefinitionNotFoundError(error: unknown): error is DefinitionNotFoundError;
