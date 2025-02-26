/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { fetchNodesFromClusterStats } from './fetch_nodes_from_cluster_stats';

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

describe('fetchNodesFromClusterStats', () => {
  const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  const clusters = [
    {
      clusterUuid: 'NG2d5jHiSBGPE6HLlUN2Bg',
      clusterName: 'elasticsearch',
    },
  ];

  const legacyRes = {
    aggregations: {
      clusters: {
        buckets: [
          {
            key: 'NG2d5jHiSBGPE6HLlUN2Bg',
            doc_count: 12,
            top: {
              hits: {
                total: { value: 12, relation: 'eq' },
                max_score: null,
                hits: [
                  {
                    _index: '.monitoring-es-7-2022.01.27',
                    _id: 'IlmvnX4BfK-FILsH34eS',
                    _score: null,
                    _source: {
                      cluster_state: {
                        nodes_hash: 858284333,
                        nodes: {
                          qrLmmSBMSXGSfciYLjL3GA: {
                            transport_address: '127.0.0.1:9300',
                            roles: [
                              'data',
                              'data_cold',
                              'data_content',
                              'data_frozen',
                              'data_hot',
                              'data_warm',
                              'ingest',
                              'master',
                              'ml',
                              'remote_cluster_client',
                              'transform',
                            ],
                            name: 'desktop-dca-192-168-162-170.endgames.local',
                            attributes: {
                              'ml.machine_memory': '34359738368',
                              'xpack.installed': 'true',
                              'ml.max_jvm_size': '1610612736',
                            },
                            ephemeral_id: 'cCXPWB3nSoKkl_m_q2nPFQ',
                          },
                        },
                      },
                    },
                    sort: [1643323056014],
                  },
                  {
                    _index: '.monitoring-es-7-2022.01.27',
                    _id: 'GVmvnX4BfK-FILsHuIeF',
                    _score: null,
                    _source: {
                      cluster_state: {
                        nodes_hash: 858284333,
                        nodes: {
                          qrLmmSBMSXGSfciYLjL3GA: {
                            transport_address: '127.0.0.1:9300',
                            roles: [
                              'data',
                              'data_cold',
                              'data_content',
                              'data_frozen',
                              'data_hot',
                              'data_warm',
                              'ingest',
                              'master',
                              'ml',
                              'remote_cluster_client',
                              'transform',
                            ],
                            name: 'desktop-dca-192-168-162-170.endgames.local',
                            attributes: {
                              'ml.machine_memory': '34359738368',
                              'xpack.installed': 'true',
                              'ml.max_jvm_size': '1610612736',
                            },
                            ephemeral_id: 'cCXPWB3nSoKkl_m_q2nPFQ',
                          },
                        },
                      },
                    },
                    sort: [1643323046019],
                  },
                ],
              },
            },
          },
        ],
      },
    },
  };

  const ecsRes = {
    aggregations: {
      clusters: {
        buckets: [
          {
            key: 'NG2d5jHiSBGPE6HLlUN2Bg',
            doc_count: 4,
            top: {
              hits: {
                total: { value: 4, relation: 'eq' },
                max_score: null,
                hits: [
                  {
                    _index: '.ds-.monitoring-es-8-mb-2023.03.27-000001',
                    _id: 'CUJ6I4cBwUW49K58n-b9',
                    _score: null,
                    _source: {
                      elasticsearch: {
                        cluster: {
                          stats: {
                            state: {
                              nodes: {
                                'LjJ9FhDATIq9uh1kAa-XPA': {
                                  name: 'instance-0000000000',
                                  ephemeral_id: '3ryJEBWZS1e3x-_K_Yt-ww',
                                  transport_address: '127.0.0.1:9300',
                                  external_id: 'instance-0000000000',
                                  attributes: {
                                    logical_availability_zone: 'zone-0',
                                    'xpack.installed': 'true',
                                    data: 'hot',
                                    region: 'unknown-region',
                                    availability_zone: 'us-central1-a',
                                  },
                                  roles: [
                                    'data_content',
                                    'data_hot',
                                    'ingest',
                                    'master',
                                    'remote_cluster_client',
                                    'transform',
                                  ],
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    sort: [1679927450602],
                  },
                  {
                    _index: '.ds-.monitoring-es-8-mb-2023.03.27-000001',
                    _id: '6kJ6I4cBwUW49K58KuXP',
                    _score: null,
                    _source: {
                      elasticsearch: {
                        cluster: {
                          stats: {
                            state: {
                              nodes: {
                                'LjJ9FhDATIq9uh1kAa-XPA': {
                                  name: 'instance-0000000000',
                                  ephemeral_id: '3ryJEBWZS1e3x-_K_Yt-ww',
                                  transport_address: '127.0.0.1:9300',
                                  external_id: 'instance-0000000000',
                                  attributes: {
                                    logical_availability_zone: 'zone-0',
                                    'xpack.installed': 'true',
                                    data: 'hot',
                                    region: 'unknown-region',
                                    availability_zone: 'us-central1-a',
                                  },
                                  roles: [
                                    'data_content',
                                    'data_hot',
                                    'ingest',
                                    'master',
                                    'remote_cluster_client',
                                    'transform',
                                  ],
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    sort: [1679927420602],
                  },
                ],
              },
            },
          },
        ],
      },
    },
  };

  it('fetch legacy stats', async () => {
    esClient.search.mockResponse(
      // @ts-expect-error not full response interface
      legacyRes
    );
    const result = await fetchNodesFromClusterStats(esClient, clusters);
    expect(result).toEqual([
      {
        clusterUuid: 'NG2d5jHiSBGPE6HLlUN2Bg',
        recentNodes: [
          {
            nodeUuid: 'qrLmmSBMSXGSfciYLjL3GA',
            nodeEphemeralId: 'cCXPWB3nSoKkl_m_q2nPFQ',
            nodeName: 'desktop-dca-192-168-162-170.endgames.local',
          },
        ],
        priorNodes: [
          {
            nodeUuid: 'qrLmmSBMSXGSfciYLjL3GA',
            nodeEphemeralId: 'cCXPWB3nSoKkl_m_q2nPFQ',
            nodeName: 'desktop-dca-192-168-162-170.endgames.local',
          },
        ],
      },
    ]);
  });

  it('fetch ecs stats', async () => {
    esClient.search.mockResponse(
      // @ts-expect-error not full response interface
      ecsRes
    );
    const result = await fetchNodesFromClusterStats(esClient, clusters);
    expect(result).toEqual([
      {
        clusterUuid: 'NG2d5jHiSBGPE6HLlUN2Bg',
        recentNodes: [
          {
            nodeUuid: 'LjJ9FhDATIq9uh1kAa-XPA',
            nodeEphemeralId: '3ryJEBWZS1e3x-_K_Yt-ww',
            nodeName: 'instance-0000000000',
          },
        ],
        priorNodes: [
          {
            nodeUuid: 'LjJ9FhDATIq9uh1kAa-XPA',
            nodeEphemeralId: '3ryJEBWZS1e3x-_K_Yt-ww',
            nodeName: 'instance-0000000000',
          },
        ],
      },
    ]);
  });

  it('should call ES with correct query', async () => {
    let params = null;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve(legacyRes as any);
    });
    await fetchNodesFromClusterStats(esClient, clusters);
    expect(params).toStrictEqual({
      index:
        '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.stack_monitoring.cluster_stats-*,metrics-elasticsearch.stack_monitoring.cluster_stats-*',
      filter_path: ['aggregations.clusters.buckets'],
      size: 0,
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
      query: {
        bool: {
          filter: [
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
            { range: { timestamp: { gte: 'now-2m' } } },
          ],
        },
      },
      aggs: {
        clusters: {
          terms: { include: ['NG2d5jHiSBGPE6HLlUN2Bg'], field: 'cluster_uuid' },
          aggs: {
            top: {
              top_hits: {
                sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
                _source: {
                  includes: ['cluster_state.nodes', 'elasticsearch.cluster.stats.state.nodes'],
                },
                size: 2,
              },
            },
          },
        },
      },
    });
  });
  it('should call ES with correct query  when ccs disabled', async () => {
    // @ts-ignore
    Globals.app.config.ui.ccs.enabled = false;
    let params = null;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve(legacyRes as any);
    });
    await fetchNodesFromClusterStats(esClient, clusters);
    // @ts-ignore
    expect(params.index).toBe(
      '.monitoring-es-*,metrics-elasticsearch.stack_monitoring.cluster_stats-*'
    );
  });

  it('ignores buckets with only one document', async () => {
    const singleHitRes = {
      aggregations: {
        clusters: {
          buckets: [
            {
              key: 'NG2d5jHiSBGPE6HLlUN2Bg',
              doc_count: 1,
              top: {
                hits: {
                  total: { value: 1, relation: 'eq' },
                  max_score: null,
                  hits: [
                    {
                      _index: '.ds-.monitoring-es-8-mb-2023.03.27-000001',
                      _id: 'CUJ6I4cBwUW49K58n-b9',
                      _score: null,
                      _source: {
                        elasticsearch: {
                          cluster: {
                            stats: {
                              state: {
                                nodes: {
                                  'LjJ9FhDATIq9uh1kAa-XPA': {
                                    name: 'instance-0000000000',
                                    ephemeral_id: '3ryJEBWZS1e3x-_K_Yt-ww',
                                    transport_address: '127.0.0.1:9300',
                                    external_id: 'instance-0000000000',
                                    attributes: {
                                      logical_availability_zone: 'zone-0',
                                      'xpack.installed': 'true',
                                      data: 'hot',
                                      region: 'unknown-region',
                                      availability_zone: 'us-central1-a',
                                    },
                                    roles: [
                                      'data_content',
                                      'data_hot',
                                      'ingest',
                                      'master',
                                      'remote_cluster_client',
                                      'transform',
                                    ],
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                      sort: [1679927450602],
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    };

    esClient.search.mockResponse(
      // @ts-expect-error not full response interface
      singleHitRes
    );

    const result = await fetchNodesFromClusterStats(esClient, clusters);
    expect(result).toEqual([]);
  });
});
