/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { DataStreamClient } from '@kbn/data-streams';
import { DiscoveryClient } from './discovery_client';
import {
  discoveriesDataStream,
  type StoredDiscovery,
  type discoveriesMappings,
} from './data_stream';

export class DiscoveryService {
  constructor(private readonly logger: Logger) {}

  async getClient({
    esClient,
    space,
  }: {
    esClient: ElasticsearchClient;
    space: string;
  }): Promise<DiscoveryClient> {
    const dataStreamClient = await DataStreamClient.initialize<
      typeof discoveriesMappings,
      StoredDiscovery
    >({
      dataStream: discoveriesDataStream,
      elasticsearchClient: esClient,
      logger: this.logger,
    });

    if (!dataStreamClient) {
      throw new Error(`Failed to initialize data stream client for ${discoveriesDataStream.name}`);
    }

    return new DiscoveryClient({
      dataStreamClient,
      esClient,
      space,
    });
  }
}
