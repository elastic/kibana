/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { fetchStackProductUsage } from './fetch_stack_product_usage';

describe('fetchStackProductUsage', () => {
  const clusterUuid = '1abcde2';
  const config: any = {
    ui: {
      max_bucket_size: 10000,
    },
  };

  it('should use appropiate query parameters', async () => {
    const searchMock = jest.fn().mockImplementation(() => ({
      aggregations: {
        uuids: {
          buckets: [
            {
              key: 'sadfsdf',
              indices: {
                buckets: [
                  {
                    key: '.monitoring-kibana-8',
                  },
                ],
              },
            },
          ],
        },
      },
    }));
    const callCluster = { search: searchMock } as unknown as ElasticsearchClient;
    await fetchStackProductUsage(
      config,
      callCluster,
      clusterUuid,
      '.monitoring-kibana-*',
      'kibana_stats',
      'kibana_stats.kibana.uuid',
      [
        {
          term: {
            type: {
              value: 'foo',
            },
          },
        },
      ]
    );
    const params = searchMock.mock.calls[0][0];
    expect(params.body.query.bool.must[0].term.type.value).toBe('kibana_stats');
    expect(params.body.query.bool.must[1].term.cluster_uuid.value).toBe(clusterUuid);
    expect(params.body.query.bool.must[2].range.timestamp.gte).toBe('now-1h');
    expect(params.body.query.bool.must[3].term.type.value).toBe('foo');
  });

  it('should get the usage data', async () => {
    const callCluster = {
      search: jest.fn().mockImplementation(() => ({
        aggregations: {
          uuids: {
            buckets: [
              {
                key: 'sadfsdf',
                indices: {
                  buckets: [
                    {
                      key: '.monitoring-kibana-8',
                    },
                  ],
                },
              },
            ],
          },
        },
      })),
    } as unknown as ElasticsearchClient;

    const result = await fetchStackProductUsage(
      config,
      callCluster,
      clusterUuid,
      '.monitoring-kibana-*',
      'kibana_stats',
      'kibana_stats.kibana.uuid'
    );

    expect(result).toStrictEqual({
      count: 1,
      enabled: true,
      metricbeatUsed: false,
    });
  });

  it('should handle both collection types', async () => {
    const callCluster = {
      search: jest.fn().mockImplementation(() => ({
        aggregations: {
          uuids: {
            buckets: [
              {
                key: 'sadfsdf',
                indices: {
                  buckets: [
                    {
                      key: '.monitoring-kibana-8',
                    },
                    {
                      key: '.monitoring-kibana-mb-8',
                    },
                  ],
                },
              },
            ],
          },
        },
      })),
    } as unknown as ElasticsearchClient;

    const result = await fetchStackProductUsage(
      config,
      callCluster,
      clusterUuid,
      '.monitoring-kibana-*',
      'kibana_stats',
      'kibana_stats.kibana.uuid'
    );

    expect(result).toStrictEqual({
      count: 1,
      enabled: true,
      metricbeatUsed: true,
    });
  });
});
