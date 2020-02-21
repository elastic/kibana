/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { addStackStats, getAllStats, handleAllStats } from './get_all_stats';
import { ESClusterStats } from './get_es_stats';
import { KibanaStats } from './get_kibana_stats';
import { ClustersHighLevelStats } from './get_high_level_stats';

describe('get_all_stats', () => {
  const size = 123;
  const start = 0;
  const end = 1;
  const callCluster = sinon.stub();
  const server = {
    config: sinon.stub().returns({
      get: sinon
        .stub()
        .withArgs('xpack.monitoring.elasticsearch.index_pattern')
        .returns('.monitoring-es-N-*')
        .withArgs('xpack.monitoring.kibana.index_pattern')
        .returns('.monitoring-kibana-N-*')
        .withArgs('xpack.monitoring.logstash.index_pattern')
        .returns('.monitoring-logstash-N-*')
        .withArgs('xpack.monitoring.max_bucket_size')
        .returns(size),
    }),
  };

  const esClusters = [
    { cluster_uuid: 'a' },
    { cluster_uuid: 'b', random_setting_not_removed: false },
    { cluster_uuid: 'c', random_setting_not_removed: true },
  ];
  const kibanaStats = {
    a: {
      count: 2,
      versions: [{ version: '1.2.3-alpha1', count: 2 }],
      cloud: [
        {
          name: 'bare-metal',
          count: 4,
          vms: 2,
          vm_types: [
            { vm_type: 'x1', count: 2 },
            { vm_type: 'ps4', count: 2 },
          ],
          regions: [
            { region: 'abc-123', count: 2 },
            { region: 'def-123', count: 2 },
          ],
          zones: [{ zone: 'def-123-A', count: 2 }],
        },
      ],
    },
    b: {
      count: 3,
      versions: [
        { version: '2.3.4-rc1', count: 1 },
        { version: '2.3.4', count: 1 },
      ],
    },
  };
  const logstashStats = {
    a: {
      count: 23,
      versions: [{ version: '1.2.3-beta1', count: 23 }],
    },
    b: {
      count: 32,
      versions: [
        { version: '2.3.4-beta2', count: 15 },
        { version: '2.3.4', count: 17 },
      ],
    },
  };
  const expectedClusters = [
    {
      cluster_uuid: 'a',
      stack_stats: {
        kibana: kibanaStats.a,
        logstash: logstashStats.a,
      },
    },
    {
      cluster_uuid: 'b',
      random_setting_not_removed: false,
      stack_stats: {
        kibana: kibanaStats.b,
        logstash: logstashStats.b,
      },
    },
    {
      cluster_uuid: 'c',
      random_setting_not_removed: true,
    },
  ];

  describe('getAllStats', () => {
    it('returns clusters', async () => {
      const esStatsResponse = {
        hits: {
          hits: [{ _id: 'a', _source: { cluster_uuid: 'a' } }],
        },
      };
      const kibanaStatsResponse = {
        hits: {
          hits: [
            {
              _source: {
                cluster_uuid: 'a',
                kibana_stats: {
                  kibana: {
                    version: '1.2.3-alpha1',
                  },
                  os: {
                    platform: 'win',
                    platformRelease: 'win-10.0',
                  },
                },
              },
            },
          ],
        },
      };
      const logstashStatsResponse = {
        hits: {
          hits: [
            {
              _source: {
                cluster_uuid: 'a',
                logstash_stats: {
                  logstash: {
                    version: '2.3.4-beta2',
                  },
                },
              },
            },
          ],
        },
      };
      const allClusters = [
        {
          cluster_uuid: 'a',
          stack_stats: {
            kibana: {
              count: 1,
              versions: [{ version: '1.2.3-alpha1', count: 1 }],
              os: {
                platforms: [{ platform: 'win', count: 1 }],
                platformReleases: [{ platformRelease: 'win-10.0', count: 1 }],
                distros: [],
                distroReleases: [],
              },
              cloud: undefined,
            },
            logstash: {
              count: 1,
              versions: [{ version: '2.3.4-beta2', count: 1 }],
              os: {
                platforms: [],
                platformReleases: [],
                distros: [],
                distroReleases: [],
              },
              cloud: undefined,
            },
          },
        },
      ];

      callCluster
        .withArgs('search')
        .onCall(0)
        .returns(Promise.resolve(esStatsResponse))
        .onCall(1)
        .returns(Promise.resolve(kibanaStatsResponse))
        .onCall(2)
        .returns(Promise.resolve(logstashStatsResponse))
        .onCall(3)
        .returns(Promise.resolve({})) // Beats stats
        .onCall(4)
        .returns(Promise.resolve({})); // Beats state

      expect(
        await getAllStats([{ clusterUuid: 'a' }], {
          callCluster: callCluster as any,
          usageCollection: {} as any,
          server,
          start,
          end,
        })
      ).toStrictEqual(allClusters);
    });

    it('returns empty clusters', async () => {
      const clusterUuidsResponse = {
        aggregations: { cluster_uuids: { buckets: [] } },
      };

      callCluster.withArgs('search').returns(Promise.resolve(clusterUuidsResponse));

      expect(
        await getAllStats([], {
          callCluster: callCluster as any,
          usageCollection: {} as any,
          server,
          start,
          end,
        })
      ).toStrictEqual([]);
    });
  });

  describe('handleAllStats', () => {
    it('handles response', () => {
      const clusters = handleAllStats(esClusters as ESClusterStats[], {
        kibana: (kibanaStats as unknown) as KibanaStats,
        logstash: (logstashStats as unknown) as ClustersHighLevelStats,
        beats: {},
      });

      expect(clusters).toStrictEqual(expectedClusters);
    });

    it('handles no clusters response', () => {
      const clusters = handleAllStats([], {} as any);

      expect(clusters).toHaveLength(0);
    });
  });

  describe('addStackStats', () => {
    it('searches for clusters', () => {
      const cluster = { cluster_uuid: 'a' };
      const stats = {
        a: {
          count: 2,
          versions: [
            { version: '5.4.0', count: 1 },
            { version: '5.5.0', count: 1 },
          ],
        },
        b: {
          count: 2,
          versions: [{ version: '5.4.0', count: 2 }],
        },
      };

      addStackStats(cluster as ESClusterStats, stats, 'xyz');

      expect((cluster as any).stack_stats.xyz).toStrictEqual(stats.a);
    });
  });
});
