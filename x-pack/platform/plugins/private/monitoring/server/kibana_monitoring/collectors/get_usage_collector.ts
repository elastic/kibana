/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { IClusterClient } from '@kbn/core/server';
import { MonitoringConfig } from '../../config';
import { getStackProductsUsage } from './lib/get_stack_products_usage';
import { fetchLicenseType } from './lib/fetch_license_type';
import { MonitoringUsage, StackProductUsage, MonitoringClusterStackProductUsage } from './types';
import { fetchClusters } from '../../lib/alerts/fetch_clusters';

export function getMonitoringUsageCollector(
  usageCollection: UsageCollectionSetup,
  config: MonitoringConfig,
  getClient: () => IClusterClient
) {
  return usageCollection.makeUsageCollector<MonitoringUsage>({
    type: 'monitoring',
    isReady: () => true,
    schema: {
      hasMonitoringData: {
        type: 'boolean',
      },
      clusters: {
        type: 'array',
        items: {
          license: {
            type: 'keyword',
          },
          clusterUuid: {
            type: 'keyword',
          },
          metricbeatUsed: {
            type: 'boolean',
          },
          elasticsearch: {
            enabled: {
              type: 'boolean',
            },
            count: {
              type: 'long',
            },
            metricbeatUsed: {
              type: 'boolean',
            },
          },
          kibana: {
            enabled: {
              type: 'boolean',
            },
            count: {
              type: 'long',
            },
            metricbeatUsed: {
              type: 'boolean',
            },
          },
          logstash: {
            enabled: {
              type: 'boolean',
            },
            count: {
              type: 'long',
            },
            metricbeatUsed: {
              type: 'boolean',
            },
          },
          beats: {
            enabled: {
              type: 'boolean',
            },
            count: {
              type: 'long',
            },
            metricbeatUsed: {
              type: 'boolean',
            },
          },
          apm: {
            enabled: {
              type: 'boolean',
            },
            count: {
              type: 'long',
            },
            metricbeatUsed: {
              type: 'boolean',
            },
          },
        },
      },
    },
    fetch: async () => {
      const callCluster = getClient().asInternalUser;
      const usageClusters: MonitoringClusterStackProductUsage[] = [];
      const availableCcs = config.ui.ccs.enabled;
      const clusters = await fetchClusters(callCluster);
      for (const cluster of clusters) {
        const license = await fetchLicenseType(callCluster, availableCcs, cluster.clusterUuid);
        const stackProducts = await getStackProductsUsage(
          config,
          callCluster,
          availableCcs,
          cluster.clusterUuid
        );
        usageClusters.push({
          clusterUuid: cluster.clusterUuid,
          license,
          metricbeatUsed: Object.values(stackProducts).some(
            (_usage: StackProductUsage) => _usage.metricbeatUsed
          ),
          ...stackProducts,
        });
      }

      return {
        hasMonitoringData: usageClusters.length > 0,
        clusters: usageClusters,
      };
    },
  });
}
