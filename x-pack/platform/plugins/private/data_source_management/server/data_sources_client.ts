/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

/**
 * Server-side Elasticsearch client for data source management.
 * Pass a scoped cluster client (`asCurrentUser`, `asInternalUser`, etc.) appropriate
 * to the request context.
 */
export class DataSourcesClient {
  constructor(private readonly esClient: ElasticsearchClient) {}

  /**
   * Calls Elasticsearch `GET /_query/datasource`.
   *
   * **Not implemented yet:** this route does not exist on Elasticsearch; the
   * request will fail until the API is added.
   */
  public async getAll(): Promise<unknown> {
    return await this.esClient.transport.request({
      method: 'GET',
      path: '/_query/datasource',
    });
  }

  /**
   * Calls Elasticsearch `GET /_query/datasource/{id}`.
   *
   * **Not implemented yet:** this route does not exist on Elasticsearch; the
   * request will fail until the API is added.
   */
  public async get(id: string): Promise<unknown> {
    const encoded = encodeURIComponent(id);
    return await this.esClient.transport.request({
      method: 'GET',
      path: `/_query/datasource/${encoded}`,
    });
  }
}
