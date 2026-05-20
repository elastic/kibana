import { StatusError } from './status_error';
/**
 * Error thrown when an attachment link is not found in storage.
 * This represents a missing relationship between a stream and an attachment.
 */
export declare class AttachmentLinkNotFoundError extends StatusError {
    constructor(message: string);
}
