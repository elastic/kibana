/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { IDataStreamClient } from '@kbn/core-data-streams-server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  memoryHistoryDataStreamName,
  type memoryHistoryMappings,
  type StoredMemoryHistoryRecord,
} from './history_data_stream';
import type { MemoryVersionRecord } from './types';
import { throwOnBulkCreateErrors } from '../../../lib/significant_events/query_utils';

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
  dataStreamClient,
}: {
  esClient: ElasticsearchClient;
  dataStreamClient: Pick<
    IDataStreamClient<typeof memoryHistoryMappings, StoredMemoryHistoryRecord>,
    'create'
  >;
}): MemoryHistoryStorage => {
  const client: HistoryClient = {
    async index({ document }) {
      const response = await dataStreamClient.create({
        documents: [
          {
            ...document,
            '@timestamp': document.created_at,
          },
        ],
      });
      throwOnBulkCreateErrors(response);
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
