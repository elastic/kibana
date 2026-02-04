/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { SmlAttachmentChunk, SmlUpdateAction } from '@kbn/agent-builder-server/attachments';
import { smlIndexAlias, smlWriteAlias } from './constants';
import type { AttachmentServiceStart } from '../attachments';
import { resolveAttachmentForSpace } from './attachment_lookup';

export interface IndexerRequest {
  attachmentId: string;
  attachmentType: string;
  action: SmlUpdateAction;
  spaceId: string;
}

interface IndexerDeps {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  attachmentsService: AttachmentServiceStart;
  logger: Logger;
}

export class SmlIndexerService {
  constructor(private readonly deps: IndexerDeps) {}

  async indexAttachment({ attachmentId, attachmentType, action, spaceId }: IndexerRequest) {
    if (action === 'delete') {
      await this.deleteAttachmentDocs({ attachmentId, attachmentType, spaceId });
      return;
    }

    const attachment = await resolveAttachmentForSpace({
      esClient: this.deps.esClient,
      attachmentId,
      attachmentType,
      spaceId,
    });
    if (!attachment) {
      throw new Error(`Attachment "${attachmentType}:${attachmentId}" not found`);
    }

    const definition = this.deps.attachmentsService.getTypeDefinition(attachmentType);
    if (!definition) {
      throw new Error(`Attachment type "${attachmentType}" not registered`);
    }

    const smlData =
      (await definition.sml?.getSmlData(attachment, {
        savedObjectsClient: this.deps.savedObjectsClient,
        spaceId,
      })) ?? this.getDefaultSmlData(attachment, attachmentType);

    await this.deleteAttachmentDocs({ attachmentId, attachmentType, spaceId });
    await this.indexChunks({
      attachmentId,
      attachmentType,
      chunks: smlData.chunks,
      spaceId,
    });
  }

  private getDefaultSmlData(attachment: Attachment, attachmentType: string) {
    const now = new Date().toISOString();
    return {
      chunks: [
        {
          type: attachmentType,
          content: JSON.stringify(attachment.data),
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
  }

  private async indexChunks({
    attachmentId,
    attachmentType,
    chunks,
    spaceId,
  }: {
    attachmentId: string;
    attachmentType: string;
    chunks: SmlAttachmentChunk[];
    spaceId: string;
  }) {
    if (chunks.length === 0) {
      return;
    }

    const operations = chunks.flatMap((chunk, index) => {
      const chunkId = chunk.id ?? `${attachmentId}:${index}`;
      const createdAt = chunk.createdAt ?? new Date().toISOString();
      const updatedAt = chunk.updatedAt ?? createdAt;

      return [
        { index: { _index: smlWriteAlias, _id: chunkId } },
        {
          id: chunkId,
          type: chunk.type,
          title: chunk.title,
          fields: chunk.fields,
          index_patterns: chunk.indexPatterns,
          tags: chunk.tags,
          attachment_id: attachmentId,
          attachment_type: attachmentType,
          content: chunk.content,
          content_embedding: chunk.content,
          created_at: createdAt,
          updated_at: updatedAt,
          spaces: [spaceId],
        },
      ];
    });

    const response = await this.deps.esClient.bulk({
      index: smlIndexAlias,
      operations,
      refresh: false,
    });

    if (response.errors) {
      const failures = response.items.filter((item) => item.index?.error);
      this.deps.logger.error(
        `Failed to index ${failures.length} SML chunks for attachment "${attachmentId}".`
      );
      throw new Error('SML indexing failed');
    }
  }

  private async deleteAttachmentDocs({
    attachmentId,
    attachmentType,
    spaceId,
  }: {
    attachmentId: string;
    attachmentType: string;
    spaceId: string;
  }) {
    await this.deps.esClient.deleteByQuery({
      index: smlIndexAlias,
      refresh: false,
      query: {
        bool: {
          filter: [
            { term: { attachment_id: attachmentId } },
            { term: { attachment_type: attachmentType } },
            { term: { spaces: spaceId } },
          ],
        },
      },
    });
  }
}
