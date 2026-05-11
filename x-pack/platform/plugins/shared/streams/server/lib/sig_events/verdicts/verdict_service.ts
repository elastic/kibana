/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { DataStreamClient } from '@kbn/data-streams';
import { VerdictClient } from './verdict_client';
import { verdictsDataStream, type StoredVerdict, type verdictsMappings } from './data_stream';

export class VerdictService {
  getClient({ esClient, space }: { esClient: ElasticsearchClient; space: string }): VerdictClient {
    const dataStreamClient = DataStreamClient.fromDefinition<
      typeof verdictsMappings,
      StoredVerdict
    >({
      dataStream: verdictsDataStream,
      elasticsearchClient: esClient,
    });

    return new VerdictClient({
      dataStreamClient,
      esClient,
      space,
    });
  }
}
