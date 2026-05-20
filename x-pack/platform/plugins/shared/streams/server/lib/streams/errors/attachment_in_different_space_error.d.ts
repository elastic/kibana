import { StatusError } from './status_error';
/**
 * Error thrown when attempting to unlink an attachment that exists in a different space.
 * This prevents cross-space manipulation of attachments in multi-tenant environments.
 */
export declare class AttachmentInDifferentSpaceError extends StatusError {
    constructor(message: string);
}
