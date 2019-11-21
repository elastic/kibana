/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { merge } from 'lodash';
import { createStubs } from './fixtures/create_stubs';
import { alertsClustersAggregation } from '../alerts_clusters_aggregation';

const clusters = [
  { cluster_uuid: 'cluster-abc0',  cluster_name: 'cluster-abc0-name', license: { type: 'test_license' } },
  { cluster_uuid: 'cluster-abc1',  cluster_name: 'cluster-abc1-name', license: { type: 'test_license' } },
  { cluster_uuid: 'cluster-abc2',  cluster_name: 'cluster-abc2-name', license: { type: 'test_license' } },
  { cluster_uuid: 'cluster-abc3',  cluster_name: 'cluster-abc3-name', license: { type: 'test_license' } },
  { cluster_uuid: 'cluster-no-license',  cluster_name: 'cluster-no-license-name' },
  { cluster_uuid: 'cluster-invalid',  cluster_name: 'cluster-invalid-name', license: { } }
];
const mockQueryResult = {
  aggregations: {
    group_by_cluster: {
      buckets: [
        {
          key: 'cluster-abc1',
          doc_count: 1,
          group_by_severity: {
            buckets: [ { key: 'low', doc_count: 1 } ]
          }
        },
        {
          key: 'cluster-abc2',
          doc_count: 2,
          group_by_severity: {
            buckets: [ { key: 'medium', doc_count: 2 } ]
          }
        },
        {
          key: 'cluster-abc3',
          doc_count: 3,
          group_by_severity: {
            buckets: [ { key: 'high', doc_count: 3 } ]
          }
        }
      ]
    }
  }
};

describe('Alerts Clusters Aggregation', () => {
  describe('with alerts enabled', () => {
    const featureStub = sinon.stub().returns({
      getLicenseCheckResults: () => ({ clusterAlerts: { enabled: true } })
    });
    const checkLicense = () => ({ clusterAlerts: { enabled: true } });

    it('aggregates alert count summary by cluster', () => {
      const { mockReq } = createStubs(mockQueryResult, featureStub);
      return alertsClustersAggregation(mockReq, '.monitoring-alerts', clusters, checkLicense)
        .then(result => {
          expect(result).to.eql(
            {
              alertsMeta: { enabled: true },
              'cluster-abc0': undefined,
              'cluster-abc1': {
                count: 1,
                high: 0,
                low: 1,
                medium: 0
              },
              'cluster-abc2': {
                count: 2,
                high: 0,
                low: 0,
                medium: 2
              },
              'cluster-abc3': {
                count: 3,
                high: 3,
                low: 0,
                medium: 0
              },
              'cluster-no-license': undefined,
              'cluster-invalid': undefined,
            }
          );
        });
    });

    it('aggregates alert count summary by cluster include static alert', () => {
      const { mockReq } = createStubs(mockQueryResult, featureStub);
      const clusterLicenseNeedsTLS = { license: { cluster_needs_tls: true } };
      const newClusters = Array.from(clusters);

      newClusters[0] = merge({ }, clusters[0], clusterLicenseNeedsTLS);
      newClusters[1] = merge({ }, clusters[1], clusterLicenseNeedsTLS);

      return alertsClustersAggregation(mockReq, '.monitoring-alerts', newClusters, checkLicense)
        .then(result => {
          expect(result).to.eql(
            {
              alertsMeta: { enabled: true },
              'cluster-abc0': {
                count: 1,
                high: 0,
                medium: 0,
                low: 1
              },
              'cluster-abc1': {
                count: 2,
                high: 0,
                low: 2,
                medium: 0
              },
              'cluster-abc2': {
                count: 2,
                high: 0,
                low: 0,
                medium: 2
              },
              'cluster-abc3': {
                count: 3,
                high: 3,
                low: 0,
                medium: 0
              },
              'cluster-no-license': undefined,
              'cluster-invalid': undefined,
            }
          );
        });
    });
  });

  describe('with alerts disabled due to license', () => {
    it('returns the input set if disabled because monitoring cluster checks', () => {
      // monitoring clusters' license check to fail
      const featureStub = sinon.stub().returns({
        getLicenseCheckResults: () => ({ clusterAlerts: { enabled: false }, message: 'monitoring cluster license is fail' })
      });
      // prod clusters' license check to pass
      const checkLicense = () => ({ clusterAlerts: { enabled: true } });
      const { mockReq } = createStubs(mockQueryResult, featureStub);

      return alertsClustersAggregation(mockReq, '.monitoring-alerts', clusters, checkLicense)
        .then(result => {
          expect(result).to.eql({ alertsMeta: { enabled: false, message: 'monitoring cluster license is fail' } });
        });
    });

    it('returns the input set if disabled because production cluster checks', () => {
      // monitoring clusters' license check to pass
      const featureStub = sinon.stub().returns({
        getLicenseCheckResults: () => ({ clusterAlerts: { enabled: true } })
      });
      // prod clusters license check to fail
      const checkLicense = () => ({ clusterAlerts: { enabled: false } });
      const { mockReq } = createStubs(mockQueryResult, featureStub);

      return alertsClustersAggregation(mockReq, '.monitoring-alerts', clusters, checkLicense)
        .then(result => {
          expect(result).to.eql({
            alertsMeta: { enabled: true },
            'cluster-abc0': {
              clusterMeta: {
                enabled: false,
                message: 'Cluster [cluster-abc0-name] license type [test_license] does not support Cluster Alerts'
              }
            },
            'cluster-abc1': {
              clusterMeta: {
                enabled: false,
                message: 'Cluster [cluster-abc1-name] license type [test_license] does not support Cluster Alerts'
              }
            },
            'cluster-abc2': {
              clusterMeta: {
                enabled: false,
                message: 'Cluster [cluster-abc2-name] license type [test_license] does not support Cluster Alerts'
              }
            },
            'cluster-abc3': {
              clusterMeta: {
                enabled: false,
                message: 'Cluster [cluster-abc3-name] license type [test_license] does not support Cluster Alerts'
              }
            },
            'cluster-no-license': {
              clusterMeta: {
                enabled: false,
                message: `Cluster [cluster-no-license-name] license type [undefined] does not support Cluster Alerts`
              }
            },
            'cluster-invalid': {
              clusterMeta: {
                enabled: false,
                message: `Cluster [cluster-invalid-name] license type [undefined] does not support Cluster Alerts`
              }
            },
          });
        });
    });
  });
});
