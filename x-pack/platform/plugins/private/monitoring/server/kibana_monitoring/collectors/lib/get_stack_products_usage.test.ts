/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { getStackProductsUsage } from './get_stack_products_usage';

describe('getStackProductsUsage', () => {
  const config: any = {
    ui: {
      max_bucket_size: 10000,
    },
  };
  const clusterUuid = '1abcde2';
  const availableCcs = false;
  const callCluster = {
    search: jest.fn().mockImplementation(() => ({
      hits: {
        hits: [],
      },
    })),
  } as unknown as ElasticsearchClient;

  it('should get all stack products', async () => {
    const result = await getStackProductsUsage(config, callCluster, availableCcs, clusterUuid);
    expect(result.elasticsearch).toBeDefined();
    expect(result.kibana).toBeDefined();
    expect(result.logstash).toBeDefined();
    expect(result.beats).toBeDefined();
    expect(result.apm).toBeDefined();
  });
});
