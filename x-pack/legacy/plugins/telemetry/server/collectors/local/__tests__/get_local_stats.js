/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';

import { mockGetClusterInfo } from './get_cluster_info';
import { mockGetClusterStats } from './get_cluster_stats';
import { mockGetXPack } from './get_xpack';

import { omit } from 'lodash';
import {
  getLocalStats,
  getLocalStatsWithCaller,
  handleLocalStats,
} from '../get_local_stats';

const getMockServer = (getCluster = sinon.stub(), kibanaUsage = {}) => ({
  log(tags, message) {
    console.log({ tags, message });
  },
  usage: { collectorSet: { bulkFetch: () => kibanaUsage, toObject: data => data } },
  plugins: {
    xpack_main: { status: { plugin: { kbnServer: { version: '8675309-snapshot' } } } },
    elasticsearch: { getCluster },
  },
});

function mockGetLocalStats(callCluster, clusterInfo, clusterStats, license, usage, req) {
  mockGetClusterInfo(callCluster, clusterInfo, req);
  mockGetClusterStats(callCluster, clusterStats, req);
  mockGetXPack(callCluster, license, usage, req);
}

describe('get_local_stats', () => {
  const clusterUuid = 'abc123';
  const clusterName = 'my-cool-cluster';
  const version = '2.3.4';
  const clusterInfo = {
    cluster_uuid: clusterUuid,
    cluster_name: clusterName,
    version: {
      number: version
    }
  };
  const clusterStats = {
    _nodes: { failed: 123 },
    cluster_name: 'real-cool',
    indices: { totally: 456 },
    nodes: { yup: 'abc' },
    random: 123
  };
  const license = { fancy: 'license' };
  const xpack = { also: 'fancy' };
  const kibana = {
    kibana: {
      great: 'googlymoogly',
      versions: [{ version: '8675309', count: 1 }]
    },
    kibana_stats: {
      os: {
        platform: 'rocky',
        platformRelease: 'iv',
      },
    },
    localization: {
      locale: 'en',
      labelsCount: 0,
      integrities: {}
    },
    sun: { chances: 5 },
    clouds: { chances: 95 },
    rain: { chances: 2 },
    snow: { chances: 0 },
  };

  const combinedStatsResult = {
    collection: 'local',
    cluster_uuid: clusterUuid,
    cluster_name: clusterName,
    license: {
      fancy: 'license'
    },
    version,
    cluster_stats: omit(clusterStats, '_nodes', 'cluster_name'),
    stack_stats: {
      kibana: {
        great: 'googlymoogly',
        count: 1,
        indices: 1,
        os: {
          platforms: [{ platform: 'rocky', count: 1 }],
          platformReleases: [{ platformRelease: 'iv', count: 1 }]
        },
        versions: [{ version: '8675309', count: 1 }],
        plugins: {
          localization: {
            locale: 'en',
            labelsCount: 0,
            integrities: {}
          },
          sun: { chances: 5 },
          clouds: { chances: 95 },
          rain: { chances: 2 },
          snow: { chances: 0 },
        }
      },
      xpack: { also: 'fancy' },
    }
  };

  describe('handleLocalStats', () => {
    it('returns expected object without xpack and kibana data', () => {
      const result = handleLocalStats(getMockServer(), clusterInfo, clusterStats);
      expect(result.cluster_uuid).to.eql(combinedStatsResult.cluster_uuid);
      expect(result.cluster_name).to.eql(combinedStatsResult.cluster_name);
      expect(result.cluster_stats).to.eql(combinedStatsResult.cluster_stats);
      expect(result.version).to.be('2.3.4');
      expect(result.collection).to.be('local');
      expect(result.license).to.be(undefined);
      expect(result.stack_stats).to.eql({ kibana: undefined, xpack: undefined });
    });

    it('returns expected object with xpack', () => {
      const result = handleLocalStats(getMockServer(), clusterInfo, clusterStats, license, xpack);
      const { stack_stats: stack, ...cluster } = result;
      expect(cluster.collection).to.be(combinedStatsResult.collection);
      expect(cluster.cluster_uuid).to.be(combinedStatsResult.cluster_uuid);
      expect(cluster.cluster_name).to.be(combinedStatsResult.cluster_name);
      expect(stack.kibana).to.be(undefined); // not mocked for this test

      expect(cluster.version).to.eql(combinedStatsResult.version);
      expect(cluster.cluster_stats).to.eql(combinedStatsResult.cluster_stats);
      expect(cluster.license).to.eql(combinedStatsResult.license);
      expect(stack.xpack).to.eql(combinedStatsResult.stack_stats.xpack);
    });
  });

  describe('getLocalStatsWithCaller', () => {
    it('returns expected object without xpack data when X-Pack fails to respond', async () => {
      const callClusterUsageFailed = sinon.stub();

      mockGetLocalStats(
        callClusterUsageFailed,
        Promise.resolve(clusterInfo),
        Promise.resolve(clusterStats),
        Promise.resolve(license),
        Promise.reject('usage failed')
      );

      const result = await getLocalStatsWithCaller(getMockServer(), callClusterUsageFailed);
      expect(result.cluster_uuid).to.eql(combinedStatsResult.cluster_uuid);
      expect(result.cluster_name).to.eql(combinedStatsResult.cluster_name);
      expect(result.cluster_stats).to.eql(combinedStatsResult.cluster_stats);
      expect(result.version).to.be('2.3.4');
      expect(result.collection).to.be('local');

      // license and xpack usage info come from the same cluster call
      expect(result.license).to.be(undefined);
      expect(result.stack_stats.xpack).to.be(undefined);
    });

    it('returns expected object with xpack and kibana data', async () => {
      const callCluster = sinon.stub();

      mockGetLocalStats(
        callCluster,
        Promise.resolve(clusterInfo),
        Promise.resolve(clusterStats),
        Promise.resolve(license),
        Promise.resolve(xpack)
      );

      const result = await getLocalStatsWithCaller(getMockServer(callCluster, kibana), callCluster);
      expect(result.stack_stats.xpack).to.eql(combinedStatsResult.stack_stats.xpack);
      expect(result.stack_stats.kibana).to.eql(combinedStatsResult.stack_stats.kibana);
    });
  });

  describe('getLocalStats', () => {
    it('uses callWithInternalUser from data cluster', async () => {
      const getCluster = sinon.stub();
      const req = { server: getMockServer(getCluster) };
      const callWithInternalUser = sinon.stub();

      getCluster.withArgs('data').returns({ callWithInternalUser });

      mockGetLocalStats(
        callWithInternalUser,
        Promise.resolve(clusterInfo),
        Promise.resolve(clusterStats),
        Promise.resolve(license),
        Promise.resolve(xpack)
      );

      const result = await getLocalStats(req, { useInternalUser: true });
      expect(result.cluster_uuid).to.eql(combinedStatsResult.cluster_uuid);
      expect(result.cluster_name).to.eql(combinedStatsResult.cluster_name);
      expect(result.version).to.eql(combinedStatsResult.version);
      expect(result.cluster_stats).to.eql(combinedStatsResult.cluster_stats);
    });
    it('uses callWithRequest from data cluster', async () => {
      const getCluster = sinon.stub();
      const req = { server: getMockServer(getCluster) };
      const callWithRequest = sinon.stub();

      getCluster.withArgs('data').returns({ callWithRequest });

      mockGetLocalStats(
        callWithRequest,
        Promise.resolve(clusterInfo),
        Promise.resolve(clusterStats),
        Promise.resolve(license),
        Promise.resolve(xpack),
        req
      );

      const result = await getLocalStats(req, { useInternalUser: false });
      expect(result.cluster_uuid).to.eql(combinedStatsResult.cluster_uuid);
      expect(result.cluster_name).to.eql(combinedStatsResult.cluster_name);
      expect(result.version).to.eql(combinedStatsResult.version);
      expect(result.cluster_stats).to.eql(combinedStatsResult.cluster_stats);
    });
  });
});
