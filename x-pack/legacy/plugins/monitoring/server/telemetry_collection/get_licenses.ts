/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  StatsCollectionConfig,
  LicenseGetter,
} from 'src/legacy/core_plugins/telemetry/server/collection_manager';
import { SearchResponse } from 'elasticsearch';
import { ESLicense } from 'src/legacy/core_plugins/telemetry/server/telemetry_collection/get_local_license';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../common/constants';

/**
 * Get statistics for all selected Elasticsearch clusters.
 */
export const getLicenses: LicenseGetter = async (clustersDetails, { server, callCluster }) => {
  const clusterUuids = clustersDetails.map(({ clusterUuid }) => clusterUuid);
  const response = await fetchLicenses(server, callCluster, clusterUuids);
  return handleLicenses(response);
};

/**
 * Fetch the Elasticsearch stats.
 *
 * @param {Object} server The server instance
 * @param {function} callCluster The callWithRequest or callWithInternalUser handler
 * @param {Array} clusterUuids Cluster UUIDs to limit the request against
 *
 * Returns the response for the aggregations to fetch details for the product.
 */
export function fetchLicenses(
  server: StatsCollectionConfig['server'],
  callCluster: StatsCollectionConfig['callCluster'],
  clusterUuids: string[]
) {
  const config = server.config();
  const params = {
    index: INDEX_PATTERN_ELASTICSEARCH,
    size: config.get('monitoring.ui.max_bucket_size'),
    ignoreUnavailable: true,
    filterPath: ['hits.hits._source.cluster_uuid', 'hits.hits._source.license'],
    body: {
      query: {
        bool: {
          filter: [
            /*
             * Note: Unlike most places, we don't care about the old _type: cluster_stats because it would NOT
             * have the license in it (that used to be in the .monitoring-data-2 index in cluster_info)
             */
            { term: { type: 'cluster_stats' } },
            { terms: { cluster_uuid: clusterUuids } },
          ],
        },
      },
      collapse: { field: 'cluster_uuid' },
      sort: { timestamp: { order: 'desc' } },
    },
  };

  return callCluster('search', params);
}

export interface ESClusterStatsWithLicense {
  cluster_uuid: string;
  type: 'cluster_stats';
  license?: ESLicense;
}

/**
 * Extract the cluster stats for each cluster.
 */
export function handleLicenses(response: SearchResponse<ESClusterStatsWithLicense>) {
  const clusters = response.hits?.hits || [];

  return clusters.reduce(
    (acc, { _source }) => ({
      ...acc,
      [_source.cluster_uuid]: _source.license,
    }),
    {}
  );
}
