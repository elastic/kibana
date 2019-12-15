/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { addStackStats, getAllStats, handleAllStats } from '../get_all_stats';

// FAILING: https://github.com/elastic/kibana/issues/51371
describe.skip('get_all_stats', () => {
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
      const clusterUuidsResponse = {
        aggregations: { cluster_uuids: { buckets: [{ key: 'a' }] } },
      };
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
        .returns(Promise.resolve(clusterUuidsResponse))
        .onCall(1)
        .returns(Promise.resolve(esStatsResponse))
        .onCall(2)
        .returns(Promise.resolve(kibanaStatsResponse))
        .onCall(3)
        .returns(Promise.resolve(logstashStatsResponse));

      expect(await getAllStats({ callCluster, server, start, end })).to.eql(allClusters);
    });

    it('returns empty clusters', async () => {
      const clusterUuidsResponse = {
        aggregations: { cluster_uuids: { buckets: [] } },
      };

      callCluster.withArgs('search').returns(Promise.resolve(clusterUuidsResponse));

      expect(await getAllStats({ callCluster, server, start, end })).to.eql([]);
    });
  });

  describe('handleAllStats', () => {
    it('handles response', () => {
      const clusters = handleAllStats(esClusters, { kibana: kibanaStats, logstash: logstashStats });

      expect(clusters).to.eql(expectedClusters);
    });

    it('handles no clusters response', () => {
      const clusters = handleAllStats([], {});

      expect(clusters).to.have.length(0);
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

      addStackStats(cluster, stats, 'xyz');

      expect(cluster.stack_stats.xyz).to.be(stats.a);
    });
  });
});
