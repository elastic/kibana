/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { DataSetsClient } from './data_sets_client';

describe('DataSetsClient', () => {
  it('omits parquet UI settings Elasticsearch does not accept', async () => {
    const request = jest.fn().mockResolvedValue(undefined);
    const client = new DataSetsClient({
      transport: { request },
    } as unknown as ElasticsearchClient);

    await client.put('logs-parquet', {
      data_source: 'obs-prod-s3',
      resource: 's3://obs-logs-prod/**/*.parquet',
      settings: {
        format: 'parquet',
        optimized_reader: true,
        late_materialization: true,
      },
    });

    expect(request).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/_query/dataset/logs-parquet',
      body: {
        data_source: 'obs-prod-s3',
        resource: 's3://obs-logs-prod/**/*.parquet',
        settings: { format: 'parquet' },
      },
    });
  });
});
