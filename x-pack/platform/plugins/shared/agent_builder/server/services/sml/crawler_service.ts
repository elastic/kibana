/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { SmlAttachmentListItem, SmlUpdateAction } from '@kbn/agent-builder-server/attachments';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import type { AttachmentServiceStart } from '../attachments';
import type { CrawlerStateItem, CrawlerStateService } from './crawler_state_service';
import type { SmlIndexerService } from './indexer_service';

interface SmlCrawlerDeps {
  logger: Logger;
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  crawlerState: CrawlerStateService;
  indexerService: SmlIndexerService;
  attachmentsService: AttachmentServiceStart;
}

export class SmlCrawlerService {
  constructor(private readonly deps: SmlCrawlerDeps) {}

  async crawlAttachmentType(attachmentType: string): Promise<void> {
    const definition = this.deps.attachmentsService.getTypeDefinition(attachmentType);
    const smlDefinition = definition?.sml;
    if (!smlDefinition) {
      return;
    }

    await this.deps.crawlerState.ensureIndex();

    this.deps.logger.debug(`SML crawler listing attachments for "${attachmentType}"`);
    const listItems = await smlDefinition.list({
      esClient: this.deps.esClient,
      savedObjectsClient: this.deps.savedObjectsClient,
      logger: this.deps.logger,
    });
    this.deps.logger.error(
      `SML crawler found ${listItems.length} attachment candidates for "${attachmentType}"`
    );

    const stateItems = await this.deps.crawlerState.listByType(attachmentType);
    const stateById = new Map(stateItems.map((item) => [item.id, item]));

    const seenIds = new Set<string>();
    for (const listItem of listItems) {
      const stateId = buildCrawlerStateId(listItem);
      seenIds.add(stateId);

      const updatedAt = listItem.updatedAt ?? new Date().toISOString();
      const existing = stateById.get(stateId);
      if (!existing) {
        await this.deps.crawlerState.upsert({
          id: stateId,
          attachment_id: listItem.attachmentId,
          attachment_type: listItem.attachmentType,
          space_id: listItem.spaceId,
          created_at: listItem.createdAt ?? updatedAt,
          updated_at: updatedAt,
          update_action: 'create',
        });
        continue;
      }

      if (updatedAt > existing.updated_at) {
        await this.deps.crawlerState.upsert({
          ...existing,
          updated_at: updatedAt,
          update_action: 'update',
        });
      }
    }

    for (const item of stateItems) {
      if (!seenIds.has(item.id) && item.update_action !== 'delete') {
        await this.deps.crawlerState.setUpdateAction(item.id, 'delete');
      }
    }

    const queued = await this.deps.crawlerState.listQueued();
    for (const item of queued) {
      if (item.attachment_type !== attachmentType || !item.update_action) {
        continue;
      }

      await this.processQueueItem(item, item.update_action);
    }
  }

  private async processQueueItem(item: CrawlerStateItem, action: SmlUpdateAction): Promise<void> {
    const spaceId = item.space_id ?? DEFAULT_SPACE_ID;

    await this.deps.indexerService.indexAttachment({
      attachmentId: item.attachment_id,
      attachmentType: item.attachment_type,
      action,
      spaceId,
    });

    if (action === 'delete') {
      await this.deps.crawlerState.delete(item.id);
    } else {
      await this.deps.crawlerState.clearUpdateAction(item.id);
    }
  }
}

const buildCrawlerStateId = (item: SmlAttachmentListItem): string => {
  const spaceId = item.spaceId ?? DEFAULT_SPACE_ID;
  return `${item.attachmentType}:${item.attachmentId}:${spaceId}`;
};
