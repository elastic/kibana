/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, find } from 'lodash';
import { verifyMonitoringLicense } from './verify_monitoring_license';
import { i18n } from '@kbn/i18n';

export function alertsClustersAggregation(req, alertsIndex, clusters, checkLicense) {
  const verification = verifyMonitoringLicense(req.server);

  if (!verification.enabled) {
    // return metadata detailing that alerts is disabled because of the monitoring cluster license
    return Promise.resolve({ alertsMeta: verification });
  }

  const params = {
    index: alertsIndex,
    ignoreUnavailable: true,
    filterPath: 'aggregations',
    body: {
      size: 0,
      query: {
        bool: {
          must_not: [
            {
              exists: { field: 'resolved_timestamp' },
            },
          ],
        },
      },
      aggs: {
        group_by_cluster: {
          terms: {
            field: 'metadata.cluster_uuid',
            size: 10,
          },
          aggs: {
            group_by_severity: {
              range: {
                field: 'metadata.severity',
                ranges: [
                  {
                    key: 'low',
                    to: 1000,
                  },
                  {
                    key: 'medium',
                    from: 1000,
                    to: 2000,
                  },
                  {
                    key: 'high',
                    from: 2000,
                  },
                ],
              },
            },
          },
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then(result => {
    const buckets = get(result.aggregations, 'group_by_cluster.buckets');
    const meta = { alertsMeta: { enabled: true } };

    return clusters.reduce((reClusters, cluster) => {
      let alerts;

      const license = cluster.license || {};
      // check the license type of the production cluster for alerts feature support
      const prodLicenseInfo = checkLicense(license.type, license.status === 'active', 'production');
      if (prodLicenseInfo.clusterAlerts.enabled) {
        const clusterNeedsTLS = get(license, 'cluster_needs_tls', false);
        const staticAlertCount = clusterNeedsTLS ? 1 : 0;
        const bucket = find(buckets, { key: cluster.cluster_uuid });
        const bucketDocCount = get(bucket, 'doc_count', 0);
        let severities = {};

        if (bucket || staticAlertCount > 0) {
          if (bucketDocCount > 0 || staticAlertCount > 0) {
            const groupBySeverityBuckets = get(bucket, 'group_by_severity.buckets', []);
            const lowGroup = find(groupBySeverityBuckets, { key: 'low' }) || {};
            const mediumGroup = find(groupBySeverityBuckets, { key: 'medium' }) || {};
            const highGroup = find(groupBySeverityBuckets, { key: 'high' }) || {};
            severities = {
              low: (lowGroup.doc_count || 0) + staticAlertCount,
              medium: mediumGroup.doc_count || 0,
              high: highGroup.doc_count || 0,
            };
          }

          alerts = {
            count: bucketDocCount + staticAlertCount,
            ...severities,
          };
        }
      } else {
        // add metadata to the cluster's alerts object detailing that alerts are disabled because of the prod cluster license
        alerts = {
          clusterMeta: {
            enabled: false,
            message: i18n.translate(
              'xpack.monitoring.clusterAlerts.unsupportedClusterAlertsDescription',
              {
                defaultMessage:
                  'Cluster [{clusterName}] license type [{licenseType}] does not support Cluster Alerts',
                values: {
                  clusterName: cluster.cluster_name,
                  licenseType: `${license.type}`,
                },
              }
            ),
          },
        };
      }

      return Object.assign(reClusters, { [cluster.cluster_uuid]: alerts });
    }, meta);
  });
}
