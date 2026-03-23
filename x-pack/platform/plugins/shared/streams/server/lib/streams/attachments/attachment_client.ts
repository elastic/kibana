/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import type { IStorageClient } from '@kbn/storage-adapter';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { groupBy } from 'lodash';
import { AttachmentNotFoundError } from '../errors/attachment_not_found_error';
import { AttachmentLinkNotFoundError } from '../errors/attachment_link_not_found_error';
import { AttachmentInDifferentSpaceError } from '../errors/attachment_in_different_space_error';
import type { AttachmentStorageSettings } from './storage_settings';
import { ATTACHMENT_ID, ATTACHMENT_TYPE, ATTACHMENT_UUID, STREAM_NAMES } from './storage_settings';
import {
  ATTACHMENT_TYPES,
  type Attachment,
  type AttachmentBulkOperation,
  type AttachmentData,
  type AttachmentDocument,
  type AttachmentLink,
  type AttachmentType,
} from './types';
import {
  attachmentTypeToSavedObjectTypeMap,
  getAttachmentDocument,
  getAttachmentLinkUuid,
  getRulesByIds,
  getSoByIds,
  getSuggestedRules,
  getSuggestedSo,
} from './utils';

/**
 * Client for managing attachments linked to streams.
 *
 * Attachments are pre-existing objects in the system (such as saved objects like dashboards and rules)
 * that are externally managed. This client provides functionality to associate these external objects
 * to streams via links, without taking ownership of their lifecycle management.
 *
 * Handles the lifecycle of attachments associated with streams, including linking, unlinking, bulk operations, and querying attachments.
 */
export class AttachmentClient {
  constructor(
    private readonly clients: {
      storageClient: IStorageClient<AttachmentStorageSettings, AttachmentDocument>;
      soClient: SavedObjectsClientContract;
      internalSoClient: SavedObjectsClientContract;
      rulesClient: RulesClient;
    }
  ) {}

  /**
   * Helper to search attachment documents with the given filters.
   */
  private async searchAttachmentDocuments(options: {
    filter: QueryDslQueryContainer[];
    size?: number;
  }): Promise<AttachmentDocument[]> {
    const response = await this.clients.storageClient.search({
      size: options.size ?? 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: options.filter,
        },
      },
    });
    return response.hits.hits.map((hit) => hit._source);
  }

  private getAttachmentEntitiesMap: Record<
    AttachmentType,
    (ids: string[]) => Promise<AttachmentData[]>
  > = {
    dashboard: async (ids) =>
      getSoByIds({ soClient: this.clients.soClient, attachmentType: 'dashboard', ids }),
    rule: async (ids) => getRulesByIds({ rulesClient: this.clients.rulesClient, ids }),
    slo: async (ids) => getSoByIds({ soClient: this.clients.soClient, attachmentType: 'slo', ids }),
  };

  private getSuggestedEntitiesMap: Record<
    AttachmentType,
    (options: {
      query: string;
      tags?: string[];
      limit: number;
      excludeIds?: string[];
    }) => Promise<AttachmentData[]>
  > = {
    dashboard: async ({ query, tags, limit, excludeIds }) =>
      getSuggestedSo({
        soClient: this.clients.soClient,
        attachmentType: 'dashboard',
        query,
        tags,
        limit,
        excludeIds,
      }),
    rule: async ({ query, tags, limit, excludeIds }) =>
      getSuggestedRules({
        rulesClient: this.clients.rulesClient,
        query,
        tags,
        limit,
        excludeIds,
      }),
    slo: async ({ query, tags, limit, excludeIds }) =>
      getSuggestedSo({
        soClient: this.clients.soClient,
        attachmentType: 'slo',
        query,
        tags,
        limit,
        excludeIds,
      }),
  };

  /**
   * Map of validation functions for each attachment type.
   * TypeScript will enforce that all attachment types have a corresponding validation function.
   */
  private validateAttachmentExistsInSpaceMap: Record<
    AttachmentType,
    (id: string) => Promise<void>
  > = {
    dashboard: async (id) => {
      try {
        await this.clients.soClient.get(attachmentTypeToSavedObjectTypeMap.dashboard, id);
      } catch (error) {
        throw new AttachmentNotFoundError(
          `Dashboard with id "${id}" not found in the current space`
        );
      }
    },
    rule: async (id) => {
      try {
        await this.clients.rulesClient.get({ id });
      } catch (error) {
        throw new AttachmentNotFoundError(`Rule with id "${id}" not found in the current space`);
      }
    },
    slo: async (id) => {
      try {
        await this.clients.soClient.get(attachmentTypeToSavedObjectTypeMap.slo, id);
      } catch (error) {
        throw new AttachmentNotFoundError(`SLO with id "${id}" not found in the current space`);
      }
    },
  };

  /**
   * Validates that an attachment exists in the current space.
   *
   * @param link - The attachment link to validate
   * @throws {AttachmentNotFoundError} If the attachment doesn't exist in the current space
   */
  private async validateAttachmentExistsInSpace(link: AttachmentLink): Promise<void> {
    await this.validateAttachmentExistsInSpaceMap[link.type](link.id);
  }

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
  private async validateAttachmentsNotInDifferentSpace(
    attachmentLinks: AttachmentLink[]
  ): Promise<void> {
    if (attachmentLinks.length === 0) {
      return;
    }

    // Fetch attachments that exist in the current space
    const fetchedAttachments = await this.fetchAttachments(attachmentLinks);

    // If all attachments were found in current space, validation passes
    if (fetchedAttachments.length === attachmentLinks.length) {
      return;
    }

    // Find which attachments are missing from current space
    const fetchedIds = new Set(fetchedAttachments.map((a) => a.id));
    const missingLinks = attachmentLinks.filter((link) => !fetchedIds.has(link.id));

    // Check all missing attachments across all spaces in parallel (grouped by type)
    const missingByType = groupBy(missingLinks, 'type');

    await Promise.all(
      Object.entries(missingByType).map(async ([type, links]) => {
        const soType = attachmentTypeToSavedObjectTypeMap[type as AttachmentType];
        const ids = links.map((link) => link.id);

        // Search for these IDs across all spaces using _id and originId fields
        const searchTerms = ids.map((id) => `"${soType}:${id}" "${id}"`).join(' ');
        const result = await this.clients.internalSoClient.find({
          type: soType,
          perPage: ids.length,
          search: searchTerms,
          rootSearchFields: ['_id', 'originId'],
          namespaces: ['*'],
        });

        // If any were found in other spaces, throw error
        const foundIds = new Set(result.saved_objects.map((obj) => obj.id));
        if (ids.some((id) => foundIds.has(id))) {
          throw new AttachmentInDifferentSpaceError(`Cannot unlink ${type}(s).`);
        }
      })
    );
  }

  /**
   * Fetches full attachment details for a given array of attachment links.
   *
   * Groups attachment links by type and fetches them efficiently using the appropriate
   * client methods (bulk operations when available).
   *
   * @param attachmentLinks - Array of attachment links to fetch
   * @returns A promise that resolves with an array of full attachment details (without stream names)
   */
  private async fetchAttachments(attachmentLinks: AttachmentLink[]): Promise<AttachmentData[]> {
    // Group attachment links by type using lodash groupBy
    const attachmentLinksByType = groupBy(attachmentLinks, 'type');

    // Fetch attachments for each type and flatten results
    const attachments: AttachmentData[] = (
      await Promise.all(
        Object.entries(attachmentLinksByType).map(async ([type, links]) => {
          const ids = links.map((link) => link.id);
          return this.getAttachmentEntitiesMap[type as AttachmentType](ids);
        })
      )
    ).flat();

    return attachments;
  }

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
  async linkAttachment(streamName: string, link: AttachmentLink): Promise<void> {
    // Validate that the attachment exists in the current space
    await this.validateAttachmentExistsInSpace(link);

    const uuid = getAttachmentLinkUuid(link);

    let streamNames: string[];

    try {
      // Try to fetch the existing attachment
      const response = await this.clients.storageClient.get({ id: uuid });

      if (response._source) {
        // Attachment exists, add stream name if not already present
        const existingStreamNames = response._source[STREAM_NAMES];
        streamNames = existingStreamNames.includes(streamName)
          ? existingStreamNames
          : [...existingStreamNames, streamName];
      } else {
        // No source, create with stream name
        streamNames = [streamName];
      }
    } catch (error) {
      if (isNotFoundError(error)) {
        // Attachment doesn't exist, create with stream name
        streamNames = [streamName];
      } else {
        throw error;
      }
    }

    // Index the attachment document
    await this.clients.storageClient.index({
      id: uuid,
      document: getAttachmentDocument({
        id: link.id,
        type: link.type,
        uuid,
        streamNames,
      }),
    });
  }

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
  async unlinkAttachment(streamName: string, attachmentLink: AttachmentLink): Promise<void> {
    const uuid = getAttachmentLinkUuid(attachmentLink);

    let existingAttachment: AttachmentDocument;

    try {
      // Try to fetch the existing attachment link
      const response = await this.clients.storageClient.get({ id: uuid });

      if (!response._source) {
        throw new AttachmentLinkNotFoundError(
          `Attachment link not found: ${attachmentLink.type}:${attachmentLink.id}`
        );
      }

      existingAttachment = response._source;
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new AttachmentLinkNotFoundError(
          `Attachment link not found: ${attachmentLink.type}:${attachmentLink.id}`
        );
      }
      throw error;
    }

    // Validate that the attachment is not in a different space
    await this.validateAttachmentsNotInDifferentSpace([attachmentLink]);

    const existingStreamNames = existingAttachment[STREAM_NAMES];

    // Remove the stream name from the array
    const updatedStreamNames = existingStreamNames.filter(
      (existingStreamName) => existingStreamName !== streamName
    );

    // If no streams are linked to this attachment anymore, delete it
    if (updatedStreamNames.length === 0) {
      await this.clients.storageClient.delete({
        id: uuid,
      });
    } else {
      // Otherwise, update the document with the new stream names
      await this.clients.storageClient.index({
        id: uuid,
        document: getAttachmentDocument({
          id: existingAttachment[ATTACHMENT_ID],
          type: existingAttachment[ATTACHMENT_TYPE],
          uuid: existingAttachment[ATTACHMENT_UUID],
          streamNames: updatedStreamNames,
        }),
      });
    }
  }

  /**
   * Cleans up the attachment storage by removing all attachment documents.
   *
   * @returns A promise that resolves when the cleanup operation is complete
   */
  async clean() {
    await this.clients.storageClient.clean();
  }

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
  async bulk(
    streamName: string,
    operations: AttachmentBulkOperation[],
    options?: { skipSpaceValidation?: boolean }
  ): Promise<void> {
    if (operations.length === 0) {
      return;
    }

    const attachmentMap = new Map<
      string,
      {
        attachmentLink: AttachmentLink;
        operation: 'link' | 'unlink';
        uuid: string;
      }
    >();
    const attachmentLinksToValidate: AttachmentLink[] = [];
    const attachmentLinksToValidateForUnlink: AttachmentLink[] = [];

    operations.forEach((operation) => {
      const attachmentLink =
        'index' in operation ? operation.index.attachment : operation.delete.attachment;
      const uuid = getAttachmentLinkUuid(attachmentLink);
      const isLinkOperation = 'index' in operation;

      // Only add to validation array if this is a link operation and a new attachment (no duplicates)
      if (isLinkOperation && !attachmentMap.has(uuid)) {
        attachmentLinksToValidate.push(attachmentLink);
      }

      // Add to unlink validation array if this is an unlink operation
      if (!isLinkOperation && !attachmentMap.has(uuid)) {
        attachmentLinksToValidateForUnlink.push(attachmentLink);
      }

      attachmentMap.set(uuid, {
        attachmentLink,
        operation: isLinkOperation ? 'link' : 'unlink',
        uuid,
      });
    });

    // Step 1: Validate all attachments in parallel
    // - For link operations: fetch attachments to ensure they exist in current space
    // - For unlink operations: validate they're not in different spaces (unless skipSpaceValidation is set)
    const [fetchedAttachments] = await Promise.all([
      this.fetchAttachments(attachmentLinksToValidate),
      !options?.skipSpaceValidation && attachmentLinksToValidateForUnlink.length > 0
        ? this.validateAttachmentsNotInDifferentSpace(attachmentLinksToValidateForUnlink)
        : Promise.resolve(),
    ]);

    // Check if all attachments were found
    if (fetchedAttachments.length !== attachmentLinksToValidate.length) {
      const missingCount = attachmentLinksToValidate.length - fetchedAttachments.length;
      throw new AttachmentNotFoundError(
        `${missingCount} attachment${missingCount > 1 ? 's' : ''} not found in the current space`
      );
    }

    // Step 2: Get existing attachments from storage
    const attachmentUuids = Array.from(attachmentMap.keys());

    const existingAttachmentDocuments = await this.searchAttachmentDocuments({
      filter: [{ terms: { [ATTACHMENT_UUID]: attachmentUuids } }],
      size: attachmentUuids.length,
    });

    // Create a map of existing attachments by UUID
    const existingAttachmentsByUuid = new Map<string, AttachmentDocument>();
    for (const doc of existingAttachmentDocuments) {
      existingAttachmentsByUuid.set(doc[ATTACHMENT_UUID], doc);
    }

    // Step 3: Build bulk operations array
    const bulkOperations: Array<
      { index: { document: AttachmentDocument; _id: string } } | { delete: { _id: string } }
    > = [];

    attachmentMap.forEach(({ attachmentLink, operation, uuid }) => {
      if (operation === 'link') {
        // For index operations: add stream name to stream.names array
        const existingAttachment = existingAttachmentsByUuid.get(uuid);

        let streamNames: string[];
        if (existingAttachment) {
          // Attachment exists, add stream name if not already present
          const existingStreamNames = existingAttachment[STREAM_NAMES];
          streamNames = existingStreamNames.includes(streamName)
            ? existingStreamNames
            : [...existingStreamNames, streamName];
        } else {
          // Attachment doesn't exist, create with stream name
          streamNames = [streamName];
        }

        bulkOperations.push({
          index: {
            _id: uuid,
            document: getAttachmentDocument({
              id: attachmentLink.id,
              type: attachmentLink.type,
              uuid,
              streamNames,
            }),
          },
        });
      } else {
        // For delete operations: remove stream name from stream.names array
        const existingAttachment = existingAttachmentsByUuid.get(uuid);

        if (existingAttachment) {
          // Attachment exists, remove stream name from the array
          const existingStreamNames = existingAttachment[STREAM_NAMES] || [];
          const updatedStreamNames = existingStreamNames.filter(
            (existingStreamName) => existingStreamName !== streamName
          );

          // If no streams are linked to this attachment anymore, delete it
          if (updatedStreamNames.length === 0) {
            bulkOperations.push({
              delete: {
                _id: uuid,
              },
            });
          } else {
            // Otherwise, update the document with the new stream names
            bulkOperations.push({
              index: {
                _id: uuid,
                document: getAttachmentDocument({
                  id: existingAttachment[ATTACHMENT_ID],
                  type: existingAttachment[ATTACHMENT_TYPE],
                  uuid: existingAttachment[ATTACHMENT_UUID],
                  streamNames: updatedStreamNames,
                }),
              },
            });
          }
        }
      }
    });

    if (bulkOperations.length === 0) {
      return;
    }

    // Execute bulk operation - will throw on any failure
    await this.clients.storageClient.bulk({
      operations: bulkOperations,
      throwOnFail: true,
    });
  }

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
  async getAttachments(
    streamName: string,
    options?: {
      query?: string;
      attachmentTypes?: AttachmentType[];
      tags?: string[];
    }
  ): Promise<Attachment[]> {
    const filter: QueryDslQueryContainer[] = [{ terms: { [STREAM_NAMES]: [streamName] } }];
    if (options?.attachmentTypes && options.attachmentTypes.length > 0) {
      filter.push({ terms: { [ATTACHMENT_TYPE]: options.attachmentTypes } });
    }
    const attachmentDocuments = await this.searchAttachmentDocuments({ filter });

    // Extract attachment links and stream names in a single pass
    const streamNamesById = new Map<string, string[]>();
    const attachmentLinks: AttachmentLink[] = attachmentDocuments.map((doc) => {
      streamNamesById.set(doc[ATTACHMENT_ID], doc[STREAM_NAMES]);
      return {
        id: doc[ATTACHMENT_ID],
        type: doc[ATTACHMENT_TYPE],
      };
    });

    const attachments = await this.fetchAttachments(attachmentLinks);

    // Apply post-filtering for query and tags.
    // This is necessary because tags and title are not stored in the attachment document,
    // they are fetched from the actual saved objects.
    let filteredAttachments = attachments;

    const queryLower = options?.query?.toLowerCase();
    const tagsToMatch = options?.tags;

    filteredAttachments = filteredAttachments.filter((attachment) => {
      const matchesQuery = !queryLower || attachment.title.toLowerCase().includes(queryLower);
      const matchesTags =
        !tagsToMatch?.length || tagsToMatch.some((tag) => attachment.tags?.includes(tag));
      return matchesQuery && matchesTags;
    });

    // Enrich attachments with stream names
    return filteredAttachments.map((attachment) => ({
      ...attachment,
      streamNames: streamNamesById.get(attachment.id) ?? [],
    }));
  }

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
  async getSuggestions({
    streamName,
    query,
    attachmentTypes,
    tags,
    limit,
  }: {
    streamName: string;
    query: string;
    attachmentTypes?: AttachmentType[];
    tags?: string[];
    limit: number;
  }): Promise<{ suggestions: Attachment[] }> {
    // Search all types if none specified, otherwise only search the requested types
    const typesToSearch = attachmentTypes || ATTACHMENT_TYPES;

    // Fetch all attachments linked to this stream to exclude them from suggestions
    const linkedAttachmentDocuments = await this.searchAttachmentDocuments({
      filter: [{ terms: { [STREAM_NAMES]: [streamName] } }],
    });

    // Group linked attachment IDs by type
    const linkedIdsByType = new Map<AttachmentType, string[]>();
    for (const doc of linkedAttachmentDocuments) {
      const type = doc[ATTACHMENT_TYPE];
      const ids = linkedIdsByType.get(type);
      if (ids) {
        ids.push(doc[ATTACHMENT_ID]);
      } else {
        linkedIdsByType.set(type, [doc[ATTACHMENT_ID]]);
      }
    }

    const suggestionsPromises = typesToSearch.map((type) =>
      this.getSuggestedEntitiesMap[type]({
        query,
        tags,
        limit,
        excludeIds: linkedIdsByType.get(type),
      })
    );

    const results = await Promise.all(suggestionsPromises);
    const attachments = results.flat();

    // Get stream names for all suggested attachments
    const streamNamesById = await this.getStreamNamesForAttachments(attachments.map((a) => a.id));

    // Enrich attachments with stream names (empty array if not linked to any stream)
    const enrichedAttachments = attachments.map((attachment) => ({
      ...attachment,
      streamNames: streamNamesById.get(attachment.id) ?? [],
    }));

    return {
      suggestions: enrichedAttachments.slice(0, limit),
    };
  }

  /**
   * Retrieves the stream names for a list of attachment IDs.
   *
   * Queries the attachments storage to find which streams each attachment is linked to.
   *
   * @param attachmentIds - Array of attachment IDs to look up
   * @returns A Map where keys are attachment IDs and values are arrays of stream names
   */
  private async getStreamNamesForAttachments(
    attachmentIds: string[]
  ): Promise<Map<string, string[]>> {
    if (attachmentIds.length === 0) {
      return new Map();
    }

    const documents = await this.searchAttachmentDocuments({
      filter: [{ terms: { [ATTACHMENT_ID]: attachmentIds } }],
    });

    const streamNamesById = new Map<string, string[]>();
    for (const doc of documents) {
      streamNamesById.set(doc[ATTACHMENT_ID], doc[STREAM_NAMES]);
    }

    return streamNamesById;
  }

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
  async syncAttachmentList(
    streamName: string,
    links: AttachmentLink[],
    attachmentType?: AttachmentType
  ): Promise<{ deleted: AttachmentLink[]; indexed: AttachmentLink[] }> {
    const filter: QueryDslQueryContainer[] = [{ terms: { [STREAM_NAMES]: [streamName] } }];
    if (attachmentType) {
      filter.push({ terms: { [ATTACHMENT_TYPE]: [attachmentType] } });
    }
    const attachmentDocuments = await this.searchAttachmentDocuments({ filter });

    const existingAttachmentLinks: AttachmentLink[] = attachmentDocuments.map((doc) => ({
      id: doc[ATTACHMENT_ID],
      type: doc[ATTACHMENT_TYPE],
    }));

    const nextIds = new Set(links.map((link) => link.id));
    const attachmentLinksDeleted = existingAttachmentLinks.filter((link) => !nextIds.has(link.id));

    const operations: AttachmentBulkOperation[] = [
      ...attachmentLinksDeleted.map((attachmentLink) => ({
        delete: { attachment: attachmentLink },
      })),
      ...links.map((attachmentLink) => ({ index: { attachment: attachmentLink } })),
    ];

    if (operations.length) {
      // Skip space validation when syncing attachment list to allow cleanup of attachments from other spaces
      await this.bulk(streamName, operations, { skipSpaceValidation: true });
    }

    return {
      deleted: attachmentLinksDeleted,
      indexed: links,
    };
  }
}
