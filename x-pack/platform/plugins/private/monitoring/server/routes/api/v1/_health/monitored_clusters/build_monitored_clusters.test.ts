/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import assert from 'assert';
import sinon from 'sinon';
import { buildMonitoredClusters } from './build_monitored_clusters';

describe(__filename, () => {
  describe('buildMonitoringClusters', () => {
    test('it should build a representation of the monitoring state', () => {
      const clustersBuckets = [
        {
          key: 'cluster_one',
          elasticsearch: {
            buckets: [
              {
                key: 'node_one',
                shard: {
                  by_index: {
                    buckets: [
                      {
                        key: '.ds-.monitoring-es-8-mb.2022',
                        last_seen: {
                          value: 123,
                          value_as_string: '2022-01-01',
                        },
                      },
                    ],
                  },
                },
              },
              {
                key: 'node_two',
                shard: {
                  by_index: {
                    buckets: [
                      {
                        key: '.ds-metrics-elasticsearch.shard-default-2022.08.16-000001',
                        last_seen: {
                          value: 123,
                          value_as_string: '2022-08-06',
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      ];

      const logger = { warn: sinon.spy() } as unknown as Logger;
      const monitoredClusters = buildMonitoredClusters(clustersBuckets, logger);
      assert.deepEqual(monitoredClusters, {
        cluster_one: {
          elasticsearch: {
            node_one: {
              shard: {
                'metricbeat-8': {
                  index: '.ds-.monitoring-es-8-mb.2022',
                  lastSeen: '2022-01-01',
                },
              },
            },
            node_two: {
              shard: {
                package: {
                  index: '.ds-metrics-elasticsearch.shard-default-2022.08.16-000001',
                  lastSeen: '2022-08-06',
                },
              },
            },
          },
        },
      });
    });
  });
});
