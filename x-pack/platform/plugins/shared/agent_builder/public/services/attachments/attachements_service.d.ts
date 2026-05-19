import type { HttpSetup } from '@kbn/core-http-browser';
import type { UnknownAttachment, UpdateOriginResponse } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser';
import type { CheckStaleAttachmentsResponse } from '../../../common/http_api/attachments';
/**
 * Internal service for managing attachment UI definitions and API operations.
 * This service maintains a registry of UI definitions for different attachment types
 * and provides methods for attachment API operations.
 */
export declare class AttachmentsService {
    private readonly registry;
    private readonly http;
    constructor({ http }: {
        http: HttpSetup;
    });
    /**
     * Registers a UI definition for a specific attachment type.
     *
     * @param attachmentType - The unique identifier for the attachment type
     * @param definition - The UI definition for rendering this attachment type
     * @throws Error if the attachment type is already registered
     */
    addAttachmentType<TAttachment extends UnknownAttachment = UnknownAttachment>(attachmentType: string, definition: AttachmentUIDefinition<TAttachment>): void;
    /**
     * Retrieves the UI definition for a specific attachment type.
     *
     * @param attachmentType - The type identifier to look up
     * @returns The UI definition if registered, undefined otherwise
     */
    getAttachmentUiDefinition<TAttachment extends UnknownAttachment = UnknownAttachment>(attachmentType: string): AttachmentUIDefinition<TAttachment> | undefined;
    /**
     * Checks if a UI definition is registered for the given attachment type.
     *
     * @param attachmentType - The type identifier to check
     * @returns true if a definition is registered, false otherwise
     */
    hasAttachmentType(attachmentType: string): boolean;
    /**
     * Updates the origin reference for an attachment.
     * Use this after saving a by-value attachment to link it to its persistent store.
     *
     * @param conversationId - The conversation containing the attachment
     * @param attachmentId - The ID of the attachment to update
     * @param origin - The origin reference object (shape depends on attachment type)
     */
    updateOrigin(conversationId: string, attachmentId: string, origin: string): Promise<UpdateOriginResponse>;
    /**
     * Checks all conversation attachments for staleness against their origin snapshots.
     */
    checkStale(conversationId: string): Promise<CheckStaleAttachmentsResponse>;
}
