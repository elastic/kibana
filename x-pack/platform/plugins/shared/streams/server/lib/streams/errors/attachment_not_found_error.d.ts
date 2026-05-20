import { StatusError } from './status_error';
/**
 * Error thrown when an attachment (dashboard, rule, etc.) is not found in the current space.
 * This represents the actual entity not existing or not being accessible.
 */
export declare class AttachmentNotFoundError extends StatusError {
    constructor(message: string);
}
