/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { DataStreamClient } from '@kbn/data-streams';
import { MemoryClient } from './memory_client';
import { memoriesDataStream, type StoredMemoryPage, type memoriesMappings } from './data_stream';

export class MemoryService {
  getClient({ esClient, space }: { esClient: ElasticsearchClient; space: string }): MemoryClient {
    const dataStreamClient = DataStreamClient.fromDefinition<
      typeof memoriesMappings,
      StoredMemoryPage
    >({
      dataStream: memoriesDataStream,
      elasticsearchClient: esClient,
    });

    return new MemoryClient({
      dataStreamClient,
      esClient,
      space,
    });
  }
}
