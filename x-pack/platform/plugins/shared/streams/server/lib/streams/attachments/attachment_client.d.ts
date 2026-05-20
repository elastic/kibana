import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { IStorageClient } from '@kbn/storage-adapter';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { AttachmentStorageSettings } from './storage_settings';
import { type Attachment, type AttachmentBulkOperation, type AttachmentDocument, type AttachmentLink, type AttachmentType } from './types';
/**
 * Client for managing attachments linked to streams.
 *
 * Attachments are pre-existing objects in the system (such as saved objects like dashboards and rules)
 * that are externally managed. This client provides functionality to associate these external objects
 * to streams via links, without taking ownership of their lifecycle management.
 *
 * Handles the lifecycle of attachments associated with streams, including linking, unlinking, bulk operations, and querying attachments.
 */
export declare class AttachmentClient {
    private readonly clients;
    constructor(clients: {
        storageClient: IStorageClient<AttachmentStorageSettings, AttachmentDocument>;
        soClient: SavedObjectsClientContract;
        internalSoClient: SavedObjectsClientContract;
        rulesClient: RulesClient;
    });
    /**
     * Helper to search attachment documents with the given filters.
     */
    private searchAttachmentDocuments;
    private getAttachmentEntitiesMap;
    private getSuggestedEntitiesMap;
    /**
     * Map of validation functions for each attachment type.
     * TypeScript will enforce that all attachment types have a corresponding validation function.
     */
    private validateAttachmentExistsInSpaceMap;
    /**
     * Validates that an attachment exists in the current space.
     *
     * @param link - The attachment link to validate
     * @throws {AttachmentNotFoundError} If the attachment doesn't exist in the current space
     */
    private validateAttachmentExistsInSpace;
    /**
     * Validates that attachments being unlinked are not exclusively in different spaces.
     *
     * This method fetches all attachments in the current space and checks if any are missing.
     * If attachments are missing, it verifies they don't exist in other spaces (which would
     * indicate cross-space manipulation). Deleted attachments (not found anywhere) are allowed.
     *
     * @param attachmentLinks - Array of attachment links to validate
     * @throws {AttachmentInDifferentSpaceError} If any attachment exists exclusively in a different space
     */
    private validateAttachmentsNotInDifferentSpace;
    /**
     * Fetches full attachment details for a given array of attachment links.
     *
     * Groups attachment links by type and fetches them efficiently using the appropriate
     * client methods (bulk operations when available).
     *
     * @param attachmentLinks - Array of attachment links to fetch
     * @returns A promise that resolves with an array of full attachment details (without stream names)
     */
    private fetchAttachments;
    /**
     * Links an attachment to a stream.
     *
     * If a link to the attachment already exists, adds the stream name to its list of associated streams.
     * If a link to the attachment doesn't exist, creates it with the stream name.
     *
     * @param streamName - The name of the stream to link the attachment to
     * @param link - The attachment link containing the attachment id and type
     * @returns A promise that resolves when the linking operation is complete
     * @throws {AttachmentNotFoundError} If the attachment doesn't exist in the current space
     *
     * @example
     * ```typescript
     * await attachmentClient.linkAttachment('my-stream', {
     *   id: 'dashboard-123',
     *   type: 'dashboard'
     * });
     * ```
     */
    linkAttachment(streamName: string, link: AttachmentLink): Promise<void>;
    /**
     * Unlinks an attachment from a stream.
     *
     * Removes the stream name from the attachment's link.
     * If this is the last stream associated with the link, deletes the link entirely.
     * Does not validate that the attachment itself exists in the current space.
     *
     * @param streamName - The name of the stream to unlink the attachment from
     * @param attachmentLink - The attachment link containing the attachment id and type
     * @returns A promise that resolves when the unlinking operation is complete
     * @throws {AttachmentLinkNotFoundError} If the attachment link doesn't exist
     * @throws {AttachmentInDifferentSpaceError} If the attachment exists in a different space
     *
     * @example
     * ```typescript
     * await attachmentClient.unlinkAttachment('my-stream', {
     *   id: 'dashboard-123',
     *   type: 'dashboard'
     * });
     * ```
     */
    unlinkAttachment(streamName: string, attachmentLink: AttachmentLink): Promise<void>;
    /**
     * Cleans up the attachment storage by removing all attachment documents.
     *
     * @returns A promise that resolves when the cleanup operation is complete
     */
    clean(): Promise<void>;
    /**
     * Performs bulk link and unlink operations for attachments on a stream.
     *
     * This method efficiently processes multiple attachment operations in a single bulk request.
     * It handles both linking (index) and unlinking (delete) operations, managing stream name
     * associations and automatic cleanup when attachments have no remaining stream associations.
     *
     * All attachments being linked must exist in the current space and all storage operations must succeed,
     * otherwise the entire operation fails atomically. Unlink operations validate that attachments are not
     * in different spaces unless skipSpaceValidation is set to true.
     *
     * @param streamName - The name of the stream for the bulk operations
     * @param operations - Array of bulk operations to perform (index or delete)
     * @param options - Optional configuration
     * @param options.skipSpaceValidation - If true, skips space validation for unlink operations
     * @returns A promise that resolves when all operations succeed
     * @throws {AttachmentNotFoundError} If any attachment being linked doesn't exist in the current space
     * @throws {AttachmentInDifferentSpaceError} If any attachment being unlinked exists in a different space (unless skipSpaceValidation is true)
     * @throws {Error} If any storage operation fails
     *
     * @example
     * ```typescript
     * await attachmentClient.bulk('my-stream', [
     *   { index: { attachment: { id: 'dashboard-1', type: 'dashboard' } } },
     *   { delete: { attachment: { id: 'rule-1', type: 'rule' } } }
     * ]);
     * ```
     */
    bulk(streamName: string, operations: AttachmentBulkOperation[], options?: {
        skipSpaceValidation?: boolean;
    }): Promise<void>;
    /**
     * Retrieves all attachments associated with a stream, optionally filtered by type, query, and tags.
     *
     * Fetches attachment documents from storage and enriches them with full entity details
     * by querying the appropriate services.
     *
     * @param streamName - The name of the stream to get attachments for
     * @param options - Optional filters
     * @param options.query - Search query string to match against attachment titles
     * @param options.attachmentTypes - Array of attachment types to filter (e.g., ['dashboard', 'rule'])
     * @param options.tags - Array of tag strings to filter by
     * @returns A promise that resolves with an array of attachments with full entity details
     *
     * @example
     * ```typescript
     * // Get all attachments
     * const allAttachments = await attachmentClient.getAttachments('my-stream');
     *
     * // Get only attachments of specific types
     * const filtered = await attachmentClient.getAttachments('my-stream', {
     *   attachmentTypes: ['dashboard', 'rule']
     * });
     *
     * // Search with query and tags
     * const searched = await attachmentClient.getAttachments('my-stream', {
     *   query: 'security',
     *   tags: ['production']
     * });
     * ```
     */
    getAttachments(streamName: string, options?: {
        query?: string;
        attachmentTypes?: AttachmentType[];
        tags?: string[];
    }): Promise<Attachment[]>;
    /**
     * Searches for attachments that match the given query and filters.
     *
     * Provides suggestions for attachments that can be linked to streams,
     * searching across attachment types based on the specified filters.
     * Automatically excludes attachments already linked to the specified stream.
     *
     * @param options - The search options
     * @param options.streamName - The stream name to exclude already-linked attachments from
     * @param options.query - Search query string to match against attachment titles/names
     * @param options.attachmentTypes - Optional array of attachment types to search (searches all if not provided)
     * @param options.tags - Optional array of tags to filter attachments by
     * @returns A promise that resolves with an array of matching attachments
     *
     * @note Until pagination is implemented, this returns up to 1000 attachments per type.
     *
     * @example
     * ```typescript
     * const results = await attachmentClient.getSuggestions({
     *   streamName: 'my-stream',
     *   query: 'security',
     *   attachmentTypes: ['dashboard', 'rule'],
     *   tags: ['security', 'monitoring']
     * });
     * ```
     */
    getSuggestions({ streamName, query, attachmentTypes, tags, limit, }: {
        streamName: string;
        query: string;
        attachmentTypes?: AttachmentType[];
        tags?: string[];
        limit: number;
    }): Promise<{
        suggestions: Attachment[];
    }>;
    /**
     * Retrieves the stream names for a list of attachment IDs.
     *
     * Queries the attachments storage to find which streams each attachment is linked to.
     *
     * @param attachmentIds - Array of attachment IDs to look up
     * @returns A Map where keys are attachment IDs and values are arrays of stream names
     */
    private getStreamNamesForAttachments;
    /**
     * Synchronizes a stream's attachments to match a provided list.
     *
     * Compares the current attachments associated with a stream against a desired list,
     * then performs the necessary operations to add new attachments and remove old ones.
     * This is useful for bulk updates where you want to replace all attachments of a certain type.
     *
     * @param streamName - The name of the stream to synchronize attachments for
     * @param links - Array of attachment links that should be associated with the stream
     * @param attachmentType - Optional filter to only sync attachments of a specific type
     * @returns A promise that resolves with the sync operation results
     * @returns result.deleted - Array of attachment links that were removed
     * @returns result.indexed - Array of attachment links that were added (same as input links)
     *
     * @example
     * ```typescript
     * const result = await attachmentClient.syncAttachmentList('my-stream', [
     *   { id: 'dashboard-1', type: 'dashboard' },
     *   { id: 'dashboard-2', type: 'dashboard' }
     * ], 'dashboard');
     * // Removes any attachments not in the list, adds the specified attachments
     * ```
     */
    syncAttachmentList(streamName: string, links: AttachmentLink[], attachmentType?: AttachmentType): Promise<{
        deleted: AttachmentLink[];
        indexed: AttachmentLink[];
    }>;
}
