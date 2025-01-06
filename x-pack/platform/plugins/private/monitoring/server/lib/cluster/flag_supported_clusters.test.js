/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { flagSupportedClusters } from './flag_supported_clusters';

const mockReq = (log, queryResult = {}) => {
  return {
    server: {
      instanceUuid: 'kibana-1234',
      plugins: {
        elasticsearch: {
          getCluster() {
            return {
              callWithRequest() {
                return Promise.resolve(queryResult);
              },
            };
          },
        },
      },
      log,
    },
    payload: {
      timeRange: { min: -Infinity, max: Infinity },
    },
  };
};
const goldLicense = () => ({ license: { type: 'gold' } });
const basicLicense = () => ({ license: { type: 'basic' } });
const standaloneCluster = () => ({ cluster_uuid: '__standalone_cluster__' });

// TODO: tests were not being run and are not up to date
describe.skip('Flag Supported Clusters', () => {
  describe('With multiple clusters in the monitoring data', () => {
    it('When all clusters are non-Basic licensed, all are supported', () => {
      const logStub = sinon.stub();
      const req = mockReq(logStub);
      const kbnIndices = [];
      const clusters = [
        goldLicense(),
        {}, // no license
        goldLicense(),
      ];

      // pass 2 gold license clusters and check they all become flagged as supported
      return flagSupportedClusters(
        req,
        kbnIndices
      )(clusters).then((resultClusters) => {
        expect(resultClusters).toEqual([
          { ...goldLicense(), isSupported: true },
          {}, // no license
          { ...goldLicense(), isSupported: true },
        ]);
        sinon.assert.calledWith(
          logStub,
          ['debug', 'monitoring', 'supported-clusters'],
          'Found all non-basic cluster licenses. All clusters will be supported.'
        );
      });
    });

    it('When all clusters are Basic licensed, admin cluster is supported', () => {
      // uses a an object for callWithRequest query result to match the cluster we want to be supported
      const logStub = sinon.stub();
      const req = mockReq(logStub, {
        hits: {
          hits: [{ _source: { cluster_uuid: 'supported_cluster_uuid' } }],
        },
      });
      const kbnIndices = [];
      const clusters = [
        { cluster_uuid: 'supported_cluster_uuid', ...basicLicense() },
        { cluster_uuid: 'unsupported_cluster_uuid', ...basicLicense() },
      ];

      // pass 2 basic license clusters and check the intended cluster is flagged as supported
      return flagSupportedClusters(
        req,
        kbnIndices
      )(clusters).then((resultClusters) => {
        expect(resultClusters).toEqual([
          {
            cluster_uuid: 'supported_cluster_uuid',
            isSupported: true,
            ...basicLicense(),
          },
          {
            cluster_uuid: 'unsupported_cluster_uuid',
            ...basicLicense(),
          },
        ]);
        sinon.assert.calledWith(
          logStub,
          ['debug', 'monitoring', 'supported-clusters'],
          'Detected all clusters in monitoring data have basic license. Checking for supported admin cluster UUID for Kibana kibana-1234.'
        );
        sinon.assert.calledWith(
          logStub,
          ['debug', 'monitoring', 'supported-clusters'],
          'Found basic license admin cluster UUID for Monitoring UI support: supported_cluster_uuid.'
        );
      });
    });

    it('When some clusters are Basic licensed, only non-Basic licensed clusters are supported', () => {
      const logStub = sinon.stub();
      const req = mockReq(logStub);
      const kbnIndices = [];
      const clusters = [
        { cluster_uuid: 'supported_cluster_uuid_1', ...goldLicense() },
        { cluster_uuid: 'supported_cluster_uuid_2', ...goldLicense() },
        { cluster_uuid: 'unsupported_cluster_uuid', ...basicLicense() },
      ];

      // pass 2 various-license clusters and check the intended clusters are flagged as supported
      return flagSupportedClusters(
        req,
        kbnIndices
      )(clusters).then((resultClusters) => {
        expect(resultClusters).toEqual([
          {
            cluster_uuid: 'supported_cluster_uuid_1',
            isSupported: true,
            ...goldLicense(),
          },
          {
            cluster_uuid: 'supported_cluster_uuid_2',
            isSupported: true,
            ...goldLicense(),
          },
          {
            cluster_uuid: 'unsupported_cluster_uuid',
            ...basicLicense(),
          },
        ]);
        sinon.assert.calledWith(
          logStub,
          ['debug', 'monitoring', 'supported-clusters'],
          'Found some basic license clusters in monitoring data. Only non-basic will be supported.'
        );
      });
    });

    describe('involving an standalone cluster', () => {
      it('should ignore the standalone cluster in calculating supported basic clusters', () => {
        const logStub = sinon.stub();
        const req = mockReq(logStub, {
          hits: {
            hits: [{ _source: { cluster_uuid: 'supported_cluster_uuid' } }],
          },
        });
        const kbnIndices = [];
        const clusters = [
          { cluster_uuid: 'supported_cluster_uuid', ...basicLicense() },
          { cluster_uuid: 'unsupported_cluster_uuid', ...basicLicense() },
          { ...standaloneCluster() },
        ];

        return flagSupportedClusters(
          req,
          kbnIndices
        )(clusters).then((resultClusters) => {
          expect(resultClusters).toEqual([
            {
              cluster_uuid: 'supported_cluster_uuid',
              isSupported: true,
              ...basicLicense(),
            },
            {
              cluster_uuid: 'unsupported_cluster_uuid',
              ...basicLicense(),
            },
            {
              ...standaloneCluster(),
              isSupported: true,
            },
          ]);
          sinon.assert.calledWith(
            logStub,
            ['debug', 'monitoring', 'supported-clusters'],
            'Found basic license admin cluster UUID for Monitoring UI support: supported_cluster_uuid.'
          );
        });
      });

      it('should ignore the standalone cluster in calculating supported mixed license clusters', () => {
        const logStub = sinon.stub();
        const req = mockReq(logStub);
        const kbnIndices = [];
        const clusters = [
          { cluster_uuid: 'supported_cluster_uuid', ...goldLicense() },
          { cluster_uuid: 'unsupported_cluster_uuid', ...basicLicense() },
          { ...standaloneCluster() },
        ];

        return flagSupportedClusters(
          req,
          kbnIndices
        )(clusters).then((resultClusters) => {
          expect(resultClusters).toEqual([
            {
              cluster_uuid: 'supported_cluster_uuid',
              isSupported: true,
              ...goldLicense(),
            },
            {
              cluster_uuid: 'unsupported_cluster_uuid',
              ...basicLicense(),
            },
            {
              ...standaloneCluster(),
              isSupported: true,
            },
          ]);
          sinon.assert.calledWith(
            logStub,
            ['debug', 'monitoring', 'supported-clusters'],
            'Found some basic license clusters in monitoring data. Only non-basic will be supported.'
          );
        });
      });

      it('should ignore the standalone cluster in calculating supported non-basic clusters', () => {
        const logStub = sinon.stub();
        const req = mockReq(logStub);
        const kbnIndices = [];
        const clusters = [
          { cluster_uuid: 'supported_cluster_uuid_1', ...goldLicense() },
          { cluster_uuid: 'supported_cluster_uuid_2', ...goldLicense() },
          { ...standaloneCluster() },
        ];

        return flagSupportedClusters(
          req,
          kbnIndices
        )(clusters).then((resultClusters) => {
          expect(resultClusters).toEqual([
            {
              cluster_uuid: 'supported_cluster_uuid_1',
              isSupported: true,
              ...goldLicense(),
            },
            {
              cluster_uuid: 'supported_cluster_uuid_2',
              isSupported: true,
              ...goldLicense(),
            },
            {
              ...standaloneCluster(),
              isSupported: true,
            },
          ]);
          sinon.assert.calledWith(
            logStub,
            ['debug', 'monitoring', 'supported-clusters'],
            'Found all non-basic cluster licenses. All clusters will be supported.'
          );
        });
      });
    });
  });

  describe('With single cluster in the monitoring data', () => {
    let logStub;
    beforeEach(() => (logStub = sinon.stub()));

    it('When there is a single Basic-licensed cluster in the data, it is supported', () => {
      const req = mockReq(logStub);
      const kbnIndices = [];
      const clusters = [{ ...basicLicense() }];
      return flagSupportedClusters(
        req,
        kbnIndices
      )(clusters).then((result) => {
        expect(result).toEqual([{ isSupported: true, ...basicLicense() }]);
        sinon.assert.calledWith(
          logStub,
          ['debug', 'monitoring', 'supported-clusters'],
          'Found single cluster in monitoring data.'
        );
      });
    });

    it('When there is a single Gold-licensed cluster in the data, it is supported', () => {
      const req = mockReq(logStub);
      const kbnIndices = [];
      const clusters = [{ ...goldLicense() }];
      return flagSupportedClusters(
        req,
        kbnIndices
      )(clusters).then((result) => {
        expect(result).toEqual([{ isSupported: true, ...goldLicense() }]);
        sinon.assert.calledWith(
          logStub,
          ['debug', 'monitoring', 'supported-clusters'],
          'Found single cluster in monitoring data.'
        );
      });
    });

    it('When there is a deleted-license cluster in the data, it is NOT supported', () => {
      const req = mockReq(logStub);
      const kbnIndices = [];
      const deletedLicense = () => ({ license: null });
      const clusters = [{ ...deletedLicense() }];
      return flagSupportedClusters(
        req,
        kbnIndices
      )(clusters).then((result) => {
        expect(result).toEqual([{ ...deletedLicense() }]);
        sinon.assert.calledWith(
          logStub,
          ['debug', 'monitoring', 'supported-clusters'],
          'Found single cluster in monitoring data.'
        );
      });
    });

    describe('involving an standalone cluster', () => {
      it('should ensure it is supported', () => {
        const req = mockReq(logStub);
        const kbnIndices = [];
        const clusters = [{ ...standaloneCluster() }];
        return flagSupportedClusters(
          req,
          kbnIndices
        )(clusters).then((result) => {
          expect(result).toEqual([{ ...standaloneCluster(), isSupported: true }]);
          sinon.assert.calledWith(
            logStub,
            ['debug', 'monitoring', 'supported-clusters'],
            'Found single cluster in monitoring data.'
          );
        });
      });
    });
  });
});
