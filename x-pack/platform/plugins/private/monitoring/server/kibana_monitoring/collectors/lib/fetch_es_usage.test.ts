/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { fetchESUsage } from './fetch_es_usage';

describe('fetchESUsage', () => {
  const clusterUuid = '1abcde2';
  const index = '.monitoring-es-*';
  const callCluster = {
    search: jest.fn().mockImplementation(() => ({
      hits: {
        hits: [
          {
            _source: {
              cluster_stats: {
                nodes: {
                  count: {
                    total: 10,
                  },
                },
              },
            },
          },
        ],
      },
      aggregations: {
        indices: {
          buckets: [
            {
              key: '.monitoring-es-2',
            },
          ],
        },
      },
    })),
  } as unknown as ElasticsearchClient;

  it('should return usage data for Elasticsearch', async () => {
    const result = await fetchESUsage(callCluster, clusterUuid, index);
    expect(result).toStrictEqual({
      count: 10,
      enabled: true,
      metricbeatUsed: false,
    });
  });

  it('should handle some indices coming from Metricbeat', async () => {
    const customCallCluster = {
      search: jest.fn().mockImplementation(() => ({
        hits: {
          hits: [
            {
              _source: {
                cluster_stats: {
                  nodes: {
                    count: {
                      total: 10,
                    },
                  },
                },
              },
            },
          ],
        },
        aggregations: {
          indices: {
            buckets: [
              {
                key: '.monitoring-es-mb-2',
              },
            ],
          },
        },
      })),
    } as unknown as ElasticsearchClient;
    const result = await fetchESUsage(customCallCluster, clusterUuid, index);
    expect(result).toStrictEqual({
      count: 10,
      enabled: true,
      metricbeatUsed: true,
    });
  });

  it('should handle no monitoring data', async () => {
    const customCallCluster = {
      search: jest.fn().mockImplementation(() => ({
        hits: {
          hits: [],
        },
      })),
    } as unknown as ElasticsearchClient;
    const result = await fetchESUsage(customCallCluster, clusterUuid, index);
    expect(result).toStrictEqual({
      count: 0,
      enabled: false,
      metricbeatUsed: false,
    });
  });
});
