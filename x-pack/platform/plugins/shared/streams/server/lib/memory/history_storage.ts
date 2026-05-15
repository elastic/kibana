/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { memoryHistoryDataStreamName } from './history_data_stream';
import type { MemoryVersionRecord } from './types';

interface HistoryClientDocument {
  document: MemoryVersionRecord;
}

interface HistorySearchHit {
  _source: MemoryVersionRecord;
}

interface HistorySearchResponse {
  hits: { hits: HistorySearchHit[] };
}

interface HistoryClient {
  index(params: HistoryClientDocument): Promise<void>;
  search(params: Omit<SearchRequest, 'index'>): Promise<HistorySearchResponse>;
}

export interface MemoryHistoryStorage {
  getClient(): HistoryClient;
}

export const createMemoryHistoryStorage = ({
  esClient,
}: {
  esClient: ElasticsearchClient;
  logger?: unknown;
}): MemoryHistoryStorage => {
  const client: HistoryClient = {
    async index({ document }) {
      await esClient.index({
        index: memoryHistoryDataStreamName,
        document: {
          ...document,
          '@timestamp': document.created_at,
        },
      });
    },

    async search(params) {
      const response = await esClient.search({
        ...params,
        index: memoryHistoryDataStreamName,
      });
      return response as unknown as HistorySearchResponse;
    },
  };

  return { getClient: () => client };
};
