/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import type { IStorageClient } from '@kbn/storage-adapter';
import { AttachmentNotFoundError } from '../errors/attachment_not_found_error';
import type { AttachmentStorageSettings } from './storage_settings';
import { ATTACHMENT_ID, ATTACHMENT_TYPE, ATTACHMENT_UUID, STREAM_NAMES } from './storage_settings';
import {
  ATTACHMENT_TYPES,
  type Attachment,
  type AttachmentBulkOperation,
  type AttachmentDocument,
  type AttachmentLink,
  type AttachmentType,
} from './types';
import { getAttachmentDocument, getAttachmentLinkUuid, soToAttachment } from './utils';

export class AttachmentClient {
  constructor(
    private readonly clients: {
      storageClient: IStorageClient<AttachmentStorageSettings, AttachmentDocument>;
      soClient: SavedObjectsClientContract;
    }
  ) {}

  private getAttachmentEntitiesMap: Record<
    AttachmentType,
    (ids: string[]) => Promise<Attachment[]>
  > = {
    dashboard: async (ids) => {
      const result = await this.clients.soClient.bulkGet<{ title: string }>(
        ids.map((id) => ({ id, type: 'dashboard' }))
      );
      return result.saved_objects
        .filter((savedObject) => !savedObject.error)
        .map((savedObject) => soToAttachment(savedObject, 'dashboard'));
    },
  };

  private getSuggestedEntitiesMap: Record<
    AttachmentType,
    (options: { query: string; tags?: string[]; perPage: number }) => Promise<Attachment[]>
  > = {
    dashboard: async ({ query, tags, perPage }) => {
      const result = await this.clients.soClient.find<{ title: string }>({
        type: 'dashboard',
        search: query,
        perPage,
        ...(tags
          ? {
              hasReferenceOperator: 'OR',
              hasReference: tags.map((tag) => ({ type: 'tag', id: tag })),
            }
          : {}),
      });
      return result.saved_objects
        .filter((savedObject) => !savedObject.error)
        .map((savedObject) => soToAttachment(savedObject, 'dashboard'));
    },
  };

  async linkAttachment(streamName: string, link: AttachmentLink): Promise<void> {
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

  async unlinkAttachment(streamName: string, attachment: AttachmentLink): Promise<void> {
    const uuid = getAttachmentLinkUuid(attachment);

    let existingAttachment: AttachmentDocument;

    try {
      // Try to fetch the existing attachment
      const response = await this.clients.storageClient.get({ id: uuid });

      if (!response._source) {
        throw new AttachmentNotFoundError(
          `Attachment not found: ${attachment.type}:${attachment.id}`
        );
      }

      existingAttachment = response._source;
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new AttachmentNotFoundError(
          `Attachment not found: ${attachment.type}:${attachment.id}`
        );
      }
      throw error;
    }

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

  async clean() {
    await this.clients.storageClient.clean();
  }

  async bulk(streamName: string, operations: AttachmentBulkOperation[]) {
    if (operations.length === 0) {
      return { errors: false };
    }

    const attachmentMap = new Map<
      string,
      {
        attachment: AttachmentLink;
        operation: 'link' | 'unlink';
        uuid: string;
      }
    >();

    operations.forEach((operation) => {
      const attachment =
        'index' in operation ? operation.index.attachment : operation.delete.attachment;
      const uuid = getAttachmentLinkUuid(attachment);
      attachmentMap.set(uuid, {
        attachment,
        operation: 'index' in operation ? 'link' : 'unlink',
        uuid,
      });
    });

    const attachmentUuids = Array.from(attachmentMap.keys());

    // Step 2: Bulk get all attachments from storage
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

    attachmentMap.forEach(({ attachment, operation, uuid }) => {
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
              id: attachment.id,
              type: attachment.type,
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
      return { errors: false };
    }

    const bulkResponse = await this.clients.storageClient.bulk({
      operations: bulkOperations,
    });

    return { errors: bulkResponse.errors, items: bulkResponse.items };
  }

  async getAttachments(streamName: string): Promise<Attachment[]> {
    const attachmentsResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: [{ terms: { [STREAM_NAMES]: [streamName] } }],
        },
      },
    });

    const attachmentDocuments: AttachmentDocument[] = attachmentsResponse.hits.hits.map(
      ({ _source }) => _source
    );

    const attachmentIdsByType: Record<AttachmentType, string[]> = {
      dashboard: [],
    };

    for (const attachment of attachmentDocuments) {
      attachmentIdsByType[attachment[ATTACHMENT_TYPE]].push(attachment[ATTACHMENT_ID]);
    }

    const attachments: Attachment[] = (
      await Promise.all(
        ATTACHMENT_TYPES.map(async (type) => {
          const ids = attachmentIdsByType[type];
          if (ids.length === 0) {
            return [];
          }

          return this.getAttachmentEntitiesMap[type](ids);
        })
      )
    ).flat();

    return attachments;
  }

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

    const suggestions = (await Promise.all(suggestionsPromises)).flat();

    return {
      attachments: suggestions,
      hasMore: suggestions.length > perPage - 1,
    };
  }
}
