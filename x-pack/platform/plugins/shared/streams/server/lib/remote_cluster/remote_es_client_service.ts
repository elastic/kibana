/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';

export interface RemoteEsClusterConfig {
  host: string;
  apiKey: string;
}

export class RemoteEsClientService {
  private readonly client: ElasticsearchClient;

  constructor(config: RemoteEsClusterConfig) {
    this.client = new Client({
      node: config.host,
      auth: { apiKey: config.apiKey },
    }) as unknown as ElasticsearchClient;
  }

  getClient(): ElasticsearchClient {
    return this.client;
  }
}
