/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { fetchClusterHealth } from './fetch_cluster_health';

jest.mock('../../static_globals', () => ({
  Globals: {
    app: {
      config: {
        ui: {
          ccs: { enabled: true },
        },
      },
    },
  },
}));
import { Globals } from '../../static_globals';

describe('fetchClusterHealth', () => {
  it('should return the cluster health', async () => {
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    const clusterUuid = 'sdfdsaj34434';
    const clusters = [{ clusterUuid, clusterName: 'foo' }];
    const status = 'green';
    esClient.search.mockResponse({
      hits: {
        hits: [
          {
            _index: '.monitoring-es-7',
            _source: {
              cluster_state: {
                status,
              },
              cluster_uuid: clusterUuid,
            },
          },
        ],
      },
    } as estypes.SearchResponse);

    const health = await fetchClusterHealth(esClient, clusters);
    expect(health).toEqual([
      {
        health: status,
        clusterUuid,
        ccs: undefined,
      },
    ]);
  });
  it('should call ES with correct query', async () => {
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    await fetchClusterHealth(
      esClient,
      [
        { clusterUuid: '1', clusterName: 'foo1' },
        { clusterUuid: '2', clusterName: 'foo2' },
      ],
      undefined,
      '1h'
    );
    expect(esClient.search).toHaveBeenCalledWith({
      index:
        '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.stack_monitoring.cluster_stats-*,metrics-elasticsearch.stack_monitoring.cluster_stats-*',
      filter_path: [
        'hits.hits._source.cluster_state.status',
        'hits.hits._source.elasticsearch.cluster.stats.status',
        'hits.hits._source.cluster_uuid',
        'hits.hits._source.elasticsearch.cluster.id',
        'hits.hits._index',
      ],
      body: {
        size: 2,
        sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
        query: {
          bool: {
            filter: [
              { terms: { cluster_uuid: ['1', '2'] } },
              {
                bool: {
                  should: [
                    { term: { type: 'cluster_stats' } },
                    { term: { 'metricset.name': 'cluster_stats' } },
                    {
                      term: {
                        'data_stream.dataset': 'elasticsearch.stack_monitoring.cluster_stats',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
              { range: { timestamp: { gte: 'now-1h' } } },
            ],
          },
        },
        collapse: { field: 'cluster_uuid' },
      },
    });
  });

  it('should call ES with correct query when ccs disabled', async () => {
    // @ts-ignore
    Globals.app.config.ui.ccs.enabled = false;
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    let params = null;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve({} as any);
    });

    await fetchClusterHealth(esClient, [{ clusterUuid: '1', clusterName: 'foo1' }]);

    // @ts-ignore
    expect(params.index).toBe(
      '.monitoring-es-*,metrics-elasticsearch.stack_monitoring.cluster_stats-*'
    );
  });
});
