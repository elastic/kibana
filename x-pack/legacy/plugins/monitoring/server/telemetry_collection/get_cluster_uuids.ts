/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
// @ts-ignore
import { createQuery } from './create_query';
// @ts-ignore
import { INDEX_PATTERN_ELASTICSEARCH } from '../../common/constants';

import {
  ClusterDetailsGetter,
  StatsCollectionConfig,
  ClusterDetails,
} from '../../../../../../src/legacy/core_plugins/telemetry/server/collection_manager';

/**
 * Get a list of Cluster UUIDs that exist within the specified timespan.
 */
export const getClusterUuids: ClusterDetailsGetter = async config => {
  const response = await fetchClusterUuids(config);
  return handleClusterUuidsResponse(response);
};

/**
 * Fetch the aggregated Cluster UUIDs from the monitoring cluster.
 */
export function fetchClusterUuids({ server, callCluster, start, end }: StatsCollectionConfig) {
  const config = server.config();
  const params = {
    index: INDEX_PATTERN_ELASTICSEARCH,
    size: 0,
    ignoreUnavailable: true,
    filterPath: 'aggregations.cluster_uuids.buckets.key',
    body: {
      query: createQuery({ type: 'cluster_stats', start, end }),
      aggs: {
        cluster_uuids: {
          terms: {
            field: 'cluster_uuid',
            size: config.get('xpack.monitoring.max_bucket_size'),
          },
        },
      },
    },
  };

  return callCluster('search', params);
}

/**
 * Convert the aggregation response into an array of Cluster UUIDs.
 *
 * @param {Object} response The aggregation response
 * @return {Array} Strings; each representing a Cluster's UUID.
 */
export function handleClusterUuidsResponse(response: any): ClusterDetails[] {
  const uuidBuckets: any[] = get(response, 'aggregations.cluster_uuids.buckets', []);

  return uuidBuckets.map(uuidBucket => ({
    clusterUuid: uuidBucket.key as string,
  }));
}
