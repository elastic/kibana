import { StatusError } from '../streams/errors/status_error';
export declare class InvalidContentPackError extends StatusError {
    constructor(message: string);
}
export declare class ContentPackConflictError extends StatusError {
    constructor(message: string);
}
export declare class ContentPackIncludeError extends StatusError {
    constructor(message: string);
}
