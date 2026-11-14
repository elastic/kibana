/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { DataSource, DataSourceConnectionTestResult } from '../common';
import type {
  putDataSourceBodySchema,
  testDataSourceBodySchema,
} from './routes/data_sources/data_source_schema';

/**
 * Server-side Elasticsearch client for data source management.
 * Pass a scoped cluster client (`asCurrentUser`, `asInternalUser`, etc.) to the request context.
 */

const path = '/_query/data_source';
export class DataSourcesClient {
  constructor(private readonly esClient: ElasticsearchClient) {}

  /**
   * Calls Elasticsearch `GET /_query/datasource`.
   */
  public async getAll(): Promise<DataSource[]> {
    return this.esClient.transport.request({
      method: 'GET',
      path,
    });
  }

  /**
   * Calls Elasticsearch `GET /_query/datasource/{id}`.
   */
  public async get(id: string): Promise<DataSource> {
    const encoded = encodeURIComponent(id);
    return this.esClient.transport.request({
      method: 'GET',
      path: `${path}/${encoded}`,
    });
  }

  /**
   * Calls Elasticsearch `PUT /_query/datasource/{id}` (create or update a data source).
   */
  public async put(id: string, body: TypeOf<typeof putDataSourceBodySchema>): Promise<void> {
    const encoded = encodeURIComponent(id);
    return this.esClient.transport.request({
      method: 'PUT',
      path: `${path}/${encoded}`,
      body,
    });
  }

  /**
   * Calls Elasticsearch `POST /_query/data_source/_test` to check a configuration that has not
   * been saved.
   */
  public async testConnection(
    body: TypeOf<typeof testDataSourceBodySchema>
  ): Promise<DataSourceConnectionTestResult> {
    // Elasticsearch gives every node 30 seconds to answer the probe, the same as the default
    // `elasticsearch.requestTimeout`, so allow headroom above it. A retry would run the probe
    // on every node again.
    return this.esClient.transport.request(
      { method: 'POST', path: `${path}/_test`, body },
      { requestTimeout: '60s', maxRetries: 0 }
    );
  }

  /**
   * Calls Elasticsearch `DELETE /_query/datasource/{id}`.
   */
  public async delete(id: string): Promise<void> {
    const encoded = encodeURIComponent(id);
    return this.esClient.transport.request({
      method: 'DELETE',
      path: `${path}/${encoded}`,
    });
  }
}
