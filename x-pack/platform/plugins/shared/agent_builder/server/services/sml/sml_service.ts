/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/logging';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { AttachmentServiceStart } from '../attachments';
import {
  smlCrawlerTaskType,
  smlDefaultFetchInterval,
  smlIndexAlias,
  smlSearchDefaultSize,
  smlTaskScope,
} from './constants';
import { SmlIndexManager } from './index_manager';
import { CrawlerStateService } from './crawler_state_service';
import { SmlIndexerService } from './indexer_service';
import { SmlCrawlerService } from './crawler_service';
import { resolveAttachmentForSpace } from './attachment_lookup';
import { normalizeTaskInterval } from './utils';

interface SmlServiceDeps {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  savedObjects: SavedObjectsServiceStart;
  attachmentsService: AttachmentServiceStart;
}

export interface SmlIndexerParams {
  attachmentId: string;
  attachmentType: string;
  action: 'create' | 'update' | 'delete';
  spaceId: string;
}

export interface SmlSearchResult {
  chunkId: string;
  attachmentId: string;
  attachmentType: string;
  type: string;
  title?: string;
  content: string;
  spaces: string[];
}

export class SmlService {
  private readonly crawlerState: CrawlerStateService;
  private readonly indexManager: SmlIndexManager;
  private readonly indexer: SmlIndexerService;
  private readonly crawler: SmlCrawlerService;

  constructor(private readonly deps: SmlServiceDeps) {
    const esClient = this.deps.elasticsearch.client.asInternalUser;
    const savedObjectsClient = this.deps.savedObjects.createInternalRepository();

    this.crawlerState = new CrawlerStateService(esClient, this.deps.logger.get('crawler_state'));
    this.indexer = new SmlIndexerService({
      esClient,
      savedObjectsClient,
      attachmentsService: this.deps.attachmentsService,
      logger: this.deps.logger.get('indexer'),
    });
    this.indexManager = new SmlIndexManager(
      esClient,
      this.deps.logger.get('index_manager'),
      this.crawlerState
    );
    this.crawler = new SmlCrawlerService({
      esClient,
      savedObjectsClient,
      attachmentsService: this.deps.attachmentsService,
      logger: this.deps.logger.get('crawler'),
      crawlerState: this.crawlerState,
      indexerService: this.indexer,
    });
  }

  async start(taskManager: TaskManagerStartContract): Promise<void> {
    await this.indexManager.ensureIndex();
    await this.crawlerState.ensureIndex();
    await this.scheduleCrawlerTasks(taskManager);
  }

  stop(): void {}

  async indexAttachment(params: SmlIndexerParams): Promise<void> {
    await this.indexManager.ensureIndex();
    await this.crawlerState.ensureIndex();
    await this.indexer.indexAttachment(params);
  }

  async runCrawlerForType(attachmentType: string): Promise<void> {
    await this.indexManager.ensureIndex();
    await this.crawlerState.ensureIndex();
    await this.crawler.crawlAttachmentType(attachmentType);
  }

  private async scheduleCrawlerTasks(taskManager: TaskManagerStartContract): Promise<void> {
    const definitions = this.deps.attachmentsService
      .listTypeDefinitions()
      .filter((definition) => definition.sml?.list);

    await Promise.all(
      definitions.map(async (definition) => {
        const interval = normalizeTaskInterval(
          definition.sml?.fetchFrequency?.() ?? smlDefaultFetchInterval
        );
        const taskId = `${smlCrawlerTaskType}:${definition.id}`;

        await taskManager.ensureScheduled({
          id: taskId,
          taskType: smlCrawlerTaskType,
          schedule: { interval },
          params: { attachment_type: definition.id },
          state: {},
          scope: smlTaskScope,
        });
      })
    );
  }

  async search({
    request,
    query,
    size = smlSearchDefaultSize,
    spaceId,
  }: {
    request: KibanaRequest;
    query: string;
    size?: number;
    spaceId: string;
  }): Promise<{ results: SmlSearchResult[]; total: number }> {
    await this.indexManager.ensureIndex();
    const esClient = this.deps.elasticsearch.client.asInternalUser;
    const savedObjectsClient = this.deps.savedObjects.getScopedClient(request);

    const response = await esClient.search<{
      attachment_id: string;
      attachment_type: string;
      type: string;
      title?: string;
      content: string;
      spaces?: string[];
    }>({
      index: smlIndexAlias,
      size,
      query: {
        bool: {
          filter: [{ terms: { spaces: [spaceId, '*'] } }],
          must: [
            {
              semantic: {
                field: 'content_embedding',
                query,
              },
            },
          ],
        },
      },
    });

    const results: SmlSearchResult[] = [];

    for (const hit of response.hits.hits) {
      const source = hit._source;
      if (!source) {
        continue;
      }

      const attachment = await resolveAttachmentForSpace({
        esClient,
        attachmentId: source.attachment_id,
        attachmentType: source.attachment_type,
        spaceId,
      });

      if (!attachment) {
        continue;
      }

      const definition = this.deps.attachmentsService.getTypeDefinition(source.attachment_type);
      if (!definition?.sml) {
        continue;
      }

      const hasPermissions =
        (await definition.sml.hasPermissions?.(attachment, {
          request,
          spaceId,
          savedObjectsClient,
        })) ?? true;

      if (!hasPermissions) {
        continue;
      }

      results.push({
        chunkId: hit._id ?? '',
        attachmentId: source.attachment_id,
        attachmentType: source.attachment_type,
        type: source.type,
        title: source.title,
        content: source.content,
        spaces: source.spaces ?? [],
      });
    }

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? results.length;

    return { results, total };
  }
}
