/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { DataStreamClient } from '@kbn/data-streams';
import { DetectionClient } from './detection_client';
import { detectionsDataStream, type StoredDetection, type detectionsMappings } from './data_stream';

export class DetectionService {
  constructor(private readonly logger: Logger) {}

  async getClient({
    esClient,
    space,
  }: {
    esClient: ElasticsearchClient;
    space: string;
  }): Promise<DetectionClient> {
    const dataStreamClient = await DataStreamClient.initialize<
      typeof detectionsMappings,
      StoredDetection
    >({
      dataStream: detectionsDataStream,
      elasticsearchClient: esClient,
      logger: this.logger,
    });

    if (!dataStreamClient) {
      throw new Error(`Failed to initialize data stream client for ${detectionsDataStream.name}`);
    }

    return new DetectionClient({
      dataStreamClient,
      esClient,
      space,
    });
  }
}
