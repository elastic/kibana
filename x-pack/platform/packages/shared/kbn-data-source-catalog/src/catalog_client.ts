/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { CATALOG_INDEX_NAME } from './constants';
import { catalogIndexMapping } from './index_mapping';
import type { DataSourceEntry } from './types';

export class CatalogClient {
  constructor(private readonly esClient: ElasticsearchClient) {}

  async ensureIndex(): Promise<void> {
    const exists = await this.esClient.indices.exists({ index: CATALOG_INDEX_NAME });
    if (exists) {
      return;
    }
    await this.esClient.indices.create({
      index: CATALOG_INDEX_NAME,
      mappings: catalogIndexMapping,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        auto_expand_replicas: '0-1',
      },
    });
  }

  async bulkUpsert(entries: DataSourceEntry[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    const operations = entries.flatMap((entry) => [
      { index: { _index: CATALOG_INDEX_NAME, _id: entry.id } },
      entry,
    ]);

    const result = await this.esClient.bulk({ operations, refresh: 'wait_for' });

    if (result.errors) {
      const errorItems = result.items
        .filter((item) => item.index?.error)
        .map((item) => item.index?.error?.reason)
        .slice(0, 5);
      throw new Error(`Bulk upsert had errors: ${errorItems.join('; ')}`);
    }
  }

  async deleteAll(): Promise<void> {
    await this.esClient.deleteByQuery({
      index: CATALOG_INDEX_NAME,
      query: { match_all: {} },
      refresh: true,
    });
  }
}
