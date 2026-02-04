/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { SmlUpdateAction } from '@kbn/agent-builder-server/attachments';
import { smlCrawlerStateIndex } from './constants';
import { smlCrawlerStateMappings } from './mappings';

export interface CrawlerStateItem {
  id: string;
  attachment_id: string;
  attachment_type: string;
  space_id?: string;
  created_at: string;
  updated_at: string;
  update_action?: SmlUpdateAction | null;
}

export class CrawlerStateService {
  constructor(private readonly esClient: ElasticsearchClient, private readonly logger: Logger) {}

  async ensureIndex(): Promise<void> {
    const exists = await this.esClient.indices.exists({ index: smlCrawlerStateIndex });
    if (exists) {
      return;
    }

    this.logger.debug(`Creating crawler state index "${smlCrawlerStateIndex}"`);
    await this.esClient.indices.create({
      index: smlCrawlerStateIndex,
      settings: {
        auto_expand_replicas: '0-1',
        hidden: true,
      },
      mappings: smlCrawlerStateMappings,
    });
  }

  async resetIndex(): Promise<void> {
    const exists = await this.esClient.indices.exists({ index: smlCrawlerStateIndex });
    if (exists) {
      await this.esClient.indices.delete({ index: smlCrawlerStateIndex });
    }
    await this.ensureIndex();
  }

  async listByType(attachmentType: string): Promise<CrawlerStateItem[]> {
    const results: CrawlerStateItem[] = [];
    let searchAfter: unknown[] | undefined;

    while (true) {
      const response = await this.esClient.search<CrawlerStateItem>({
        index: smlCrawlerStateIndex,
        size: 1000,
        sort: [{ updated_at: 'asc' }, { id: 'asc' }],
        search_after: searchAfter,
        query: {
          bool: {
            filter: [{ term: { attachment_type: attachmentType } }],
          },
        },
      });

      const hits = response.hits.hits;
      if (hits.length === 0) {
        break;
      }

      for (const hit of hits) {
        if (hit._source) {
          results.push(hit._source);
        }
      }

      searchAfter = hits[hits.length - 1].sort;
    }

    return results;
  }

  async listQueued(): Promise<CrawlerStateItem[]> {
    const results: CrawlerStateItem[] = [];
    let searchAfter: unknown[] | undefined;

    while (true) {
      const response = await this.esClient.search<CrawlerStateItem>({
        index: smlCrawlerStateIndex,
        size: 1000,
        sort: [{ updated_at: 'asc' }, { id: 'asc' }],
        search_after: searchAfter,
        query: {
          bool: {
            filter: [{ exists: { field: 'update_action' } }],
          },
        },
      });

      const hits = response.hits.hits;
      if (hits.length === 0) {
        break;
      }

      for (const hit of hits) {
        if (hit._source) {
          results.push(hit._source);
        }
      }

      searchAfter = hits[hits.length - 1].sort;
    }

    return results;
  }

  async upsert(item: CrawlerStateItem): Promise<void> {
    await this.esClient.index({
      index: smlCrawlerStateIndex,
      id: item.id,
      document: item,
      refresh: false,
    });
  }

  async setUpdateAction(id: string, action: SmlUpdateAction): Promise<void> {
    await this.esClient.update({
      index: smlCrawlerStateIndex,
      id,
      doc: {
        update_action: action,
      },
      doc_as_upsert: false,
    });
  }

  async clearUpdateAction(id: string): Promise<void> {
    await this.esClient.update({
      index: smlCrawlerStateIndex,
      id,
      doc: {
        update_action: null,
      },
      doc_as_upsert: false,
    });
  }

  async delete(id: string): Promise<void> {
    await this.esClient.delete({
      index: smlCrawlerStateIndex,
      id,
      refresh: false,
    });
  }
}
