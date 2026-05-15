/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import type { ElasticsearchClient } from '@kbn/core/server';
import { esql } from '@elastic/esql';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { MEMORIES_DATA_STREAM } from '../../../common/constants';
import { type StoredMemoryPage, type memoriesMappings } from './data_stream';

export type MemoryDataStreamClient = IDataStreamClient<typeof memoriesMappings, StoredMemoryPage>;

export class MemoryClient {
  constructor(
    private readonly clients: {
      dataStreamClient: MemoryDataStreamClient;
      esClient: ElasticsearchClient;
      space: string;
    }
  ) {}

  async bulkCreate(pages: StoredMemoryPage[]) {
    return this.clients.dataStreamClient.create({
      space: this.clients.space,
      documents: pages,
    });
  }

  /**
   * Returns the latest (current-state) non-deleted page for each page_name,
   * filtered to the current space via kibana.space_ids.
   */
  async findLatest(): Promise<{ hits: StoredMemoryPage[] }> {
    const query = esql.from([MEMORIES_DATA_STREAM], ['_id', '_source'])
      .where`\`kibana.space_ids\` == ${this.clients.space}`
      .pipe`INLINE STATS latest_ts = MAX(@timestamp) BY \`page_name\``
      .where`@timestamp == latest_ts`.pipe`INLINE STATS tiebreaker_id = MAX(_id) BY \`page_name\``
      .where`_id == tiebreaker_id`.where`\`is_deleted\` IS NULL OR \`is_deleted\` == false`.keep(
      '_source'
    );

    const response = (await this.clients.esClient.esql.query({
      query: query.print(),
    })) as ESQLSearchResponse;

    const sourceIdx = response.columns.findIndex((c) => c.name === '_source');
    if (sourceIdx === -1) {
      return { hits: [] };
    }

    return {
      hits: response.values.map((row) => {
        const source = (row[sourceIdx] ?? {}) as Record<string, unknown>;
        const { kibana: _kibana, ...rest } = source;
        return rest as StoredMemoryPage;
      }),
    };
  }

  /**
   * Returns the latest non-deleted page for a single page_name.
   */
  async findLatestByName(pageName: string): Promise<StoredMemoryPage | undefined> {
    const query = esql.from([MEMORIES_DATA_STREAM], ['_id', '_source'])
      .where`\`kibana.space_ids\` == ${this.clients.space}`.where`\`page_name\` == ${pageName}`
      .pipe`INLINE STATS latest_ts = MAX(@timestamp) BY \`page_name\``
      .where`@timestamp == latest_ts`.pipe`INLINE STATS tiebreaker_id = MAX(_id) BY \`page_name\``
      .where`_id == tiebreaker_id`.where`\`is_deleted\` IS NULL OR \`is_deleted\` == false`.keep(
      '_source'
    );

    const response = (await this.clients.esClient.esql.query({
      query: query.print(),
    })) as ESQLSearchResponse;

    const sourceIdx = response.columns.findIndex((c) => c.name === '_source');
    if (sourceIdx === -1) return undefined;

    const row = response.values[0];
    if (!row) return undefined;

    const source = (row[sourceIdx] ?? {}) as Record<string, unknown>;
    const { kibana: _kibana, ...rest } = source;
    return rest as StoredMemoryPage;
  }
}
