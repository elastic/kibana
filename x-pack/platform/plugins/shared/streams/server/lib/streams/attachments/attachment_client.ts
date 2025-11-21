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
import type { AttachmentStorageSettings } from './storage_settings';
import { ATTACHMENT_ID, ATTACHMENT_TYPE, ATTACHMENT_UUID, STREAM_NAMES } from './storage_settings';
import {
  type Attachment,
  type AttachmentBulkOperation,
  type AttachmentDocument,
  type AttachmentLink,
  type AttachmentType,
} from './types';
import { getAttachmentDocument, getAttachmentLinkUuid, getSoByIds, getSuggestedSo } from './utils';

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
      rulesClient: RulesClient;
    }
  ) {}

  private getAttachmentEntitiesMap: Record<
    AttachmentType,
    (ids: string[]) => Promise<Attachment[]>
  > = {
    dashboard: async (ids) =>
      getSoByIds({ soClient: this.clients.soClient, attachmentType: 'dashboard', ids }),
    rule: async (ids) => {
      try {
        const { rules } = await this.clients.rulesClient.bulkGetRules({
          ids,
        });

        return rules.map((rule) => ({
          id: rule.id,
          title: rule.name,
          tags: rule.tags,
          type: 'rule',
        }));
      } catch (error) {
        if (error.message === 'No rules found for bulk get') {
          return [];
        }
        throw error;
      }
    },
  };

  private getSuggestedEntitiesMap: Record<
    AttachmentType,
    (options: { query: string; tags?: string[]; perPage: number }) => Promise<Attachment[]>
  > = {
    dashboard: async ({ query, tags, perPage }) =>
      getSuggestedSo({
        soClient: this.clients.soClient,
        attachmentType: 'dashboard',
        query,
        tags,
        perPage,
      }),
    rule: async ({ query, tags, perPage }) => {
      const { data } = await this.clients.rulesClient.find({
        options: {
          search: query,
          perPage,
          ...(tags && tags.length > 0
            ? {
                filter: tags.map((tag) => `alert.attributes.tags:"${tag}"`).join(' or '),
              }
            : {}),
        },
      });

      return data.map((rule) => ({
        id: rule.id,
        title: rule.name,
        tags: rule.tags,
        type: 'rule',
      }));
    },
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
        await this.clients.soClient.get('dashboard', id);
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
   * Fetches full attachment details for a given array of attachment links.
   *
   * Groups attachment links by type and fetches them efficiently using the appropriate
   * client methods (bulk operations when available).
   *
   * @param attachmentLinks - Array of attachment links to fetch
   * @returns A promise that resolves with an array of full attachment details
   */
  private async fetchAttachments(attachmentLinks: AttachmentLink[]): Promise<Attachment[]> {
    // Group attachment IDs by type using lodash groupBy
    const attachmentIdsByType = groupBy(attachmentLinks, 'type');

    // Fetch attachments for each type and flatten results
    const attachments: Attachment[] = (
      await Promise.all(
        Object.entries(attachmentIdsByType).map(async ([type, links]) => {
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
   *
   * @param streamName - The name of the stream to unlink the attachment from
   * @param attachmentLink - The attachment link containing the attachment id and type
   * @returns A promise that resolves when the unlinking operation is complete
   * @throws {AttachmentLinkNotFoundError} If the attachment link doesn't exist
   * @throws {AttachmentNotFoundError} If the attachment doesn't exist in the current space
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

    // Validate that the attachment exists in the current space
    await this.validateAttachmentExistsInSpace(attachmentLink);

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
   * All attachments must exist in the current space and all storage operations must succeed,
   * otherwise the entire operation fails atomically.
   *
   * @param streamName - The name of the stream for the bulk operations
   * @param operations - Array of bulk operations to perform (index or delete)
   * @returns A promise that resolves when all operations succeed
   * @throws {AttachmentNotFoundError} If any attachment doesn't exist in the current space
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
  async bulk(streamName: string, operations: AttachmentBulkOperation[]): Promise<void> {
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

    operations.forEach((operation) => {
      const attachmentLink =
        'index' in operation ? operation.index.attachment : operation.delete.attachment;
      const uuid = getAttachmentLinkUuid(attachmentLink);

      // Only add to validation array if this is a new attachment (no duplicates)
      if (!attachmentMap.has(uuid)) {
        attachmentLinksToValidate.push(attachmentLink);
      }

      attachmentMap.set(uuid, {
        attachmentLink,
        operation: 'index' in operation ? 'link' : 'unlink',
        uuid,
      });
    });

    // Step 1: Validate all attachments exist in the current space

    // Fetch attachments that exist in the current space
    const fetchedAttachments = await this.fetchAttachments(attachmentLinksToValidate);

    // Check if all attachments were found
    if (fetchedAttachments.length !== attachmentLinksToValidate.length) {
      const missingCount = attachmentLinksToValidate.length - fetchedAttachments.length;
      throw new AttachmentNotFoundError(
        `${missingCount} attachment${missingCount > 1 ? 's' : ''} not found in the current space`
      );
    }

    // Step 2: Get existing attachments from storage
    const attachmentUuids = Array.from(attachmentMap.keys());

    const existingAttachmentsResponse = await this.clients.storageClient.search({
      size: attachmentUuids.length,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            {
              terms: {
                [ATTACHMENT_UUID]: attachmentUuids,
              },
            },
          ],
        },
      },
    });

    // Create a map of existing attachments by UUID
    const existingAttachmentsByUuid = new Map<string, AttachmentDocument>();
    existingAttachmentsResponse.hits.hits.forEach((hit) => {
      if (hit._source) {
        existingAttachmentsByUuid.set(hit._source[ATTACHMENT_UUID], hit._source);
      }
    });

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
   * Retrieves all attachments associated with a stream.
   *
   * Fetches attachment documents from storage and enriches them with full entity details
   * by querying the appropriate services.
   *
   * @param streamName - The name of the stream to get attachments for
   * @param attachmentType - Optional filter to only return attachments of a specific type
   * @returns A promise that resolves with an array of attachments with full entity details
   *
   * @example
   * ```typescript
   * // Get all attachments
   * const allAttachments = await attachmentClient.getAttachments('my-stream');
   *
   * // Get only attachments of a specific type
   * const dashboards = await attachmentClient.getAttachments('my-stream', 'dashboard');
   * ```
   */
  async getAttachments(streamName: string, attachmentType?: AttachmentType): Promise<Attachment[]> {
    const filter: QueryDslQueryContainer[] = [{ terms: { [STREAM_NAMES]: [streamName] } }];
    if (attachmentType) {
      filter.push({ terms: { [ATTACHMENT_TYPE]: [attachmentType] } });
    }
    const attachmentsResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter,
        },
      },
    });

    // Convert attachment documents to attachment links
    const attachmentLinks: AttachmentLink[] = attachmentsResponse.hits.hits.map(({ _source }) => ({
      id: _source[ATTACHMENT_ID],
      type: _source[ATTACHMENT_TYPE],
    }));

    return this.fetchAttachments(attachmentLinks);
  }

  /**
   * Searches for attachments that match the given query and filters.
   *
   * Provides suggestions for attachments that can be linked to streams,
   * searching across attachment types based on the specified filters.
   *
   * @param options - The search options
   * @param options.query - Search query string to match against attachment titles/names
   * @param options.attachmentTypes - Optional array of attachment types to search (searches all if not provided)
   * @param options.tags - Optional array of tags to filter attachments by
   * @returns A promise that resolves with search results
   * @returns result.attachments - Array of matching attachments (up to 100)
   * @returns result.hasMore - Whether there are more results available beyond the returned set
   *
   * @example
   * ```typescript
   * const results = await attachmentClient.getSuggestions({
   *   query: 'security',
   *   attachmentTypes: ['dashboard', 'rule'],
   *   tags: ['security', 'monitoring']
   * });
   * ```
   */
  async getSuggestions({
    query,
    attachmentTypes,
    tags,
  }: {
    query: string;
    attachmentTypes?: AttachmentType[];
    tags?: string[];
  }): Promise<{ hasMore: boolean; attachments: Attachment[] }> {
    const perPage = 101;

    const searchAll = !attachmentTypes;

    const searchDashboards = searchAll || attachmentTypes.includes('dashboard');
    const searchRules = searchAll || attachmentTypes.includes('rule');
    const suggestionsPromises: Promise<Attachment[]>[] = [];
    if (searchDashboards) {
      suggestionsPromises.push(
        this.getSuggestedEntitiesMap.dashboard({
          query,
          tags,
          perPage,
        })
      );
    }

    if (searchRules) {
      suggestionsPromises.push(
        this.getSuggestedEntitiesMap.rule({
          query,
          tags,
          perPage,
        })
      );
    }
    const suggestions = (await Promise.all(suggestionsPromises)).flat();

    return {
      attachments: suggestions,
      hasMore: suggestions.length > perPage - 1,
    };
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
    const attachmentsResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter,
        },
      },
    });

    const existingAttachmentLinks: AttachmentLink[] = attachmentsResponse.hits.hits.map(
      ({ _source }) => {
        return {
          id: _source[ATTACHMENT_ID],
          type: _source[ATTACHMENT_TYPE],
        };
      }
    );

    const nextIds = new Set(links.map((link) => link.id));
    const attachmentLinksDeleted = existingAttachmentLinks.filter((link) => !nextIds.has(link.id));

    const operations: AttachmentBulkOperation[] = [
      ...attachmentLinksDeleted.map((attachmentLink) => ({
        delete: { attachment: attachmentLink },
      })),
      ...links.map((attachmentLink) => ({ index: { attachment: attachmentLink } })),
    ];

    if (operations.length) {
      await this.bulk(streamName, operations);
    }

    return {
      deleted: attachmentLinksDeleted,
      indexed: links,
    };
  }
}
