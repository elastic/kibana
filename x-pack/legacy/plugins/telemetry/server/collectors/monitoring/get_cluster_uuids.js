/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { createQuery } from './create_query';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../../monitoring/common/constants';

/**
 * Get a list of Cluster UUIDs that exist within the specified timespan.
 *
 * @param {Object} server The server instance
 * @param {function} callCluster The callWithRequest or callWithInternalUser handler
 * @param {Date} start The start date to look for clusters
 * @param {Date} end The end date to look for clusters
 * @return {Array} Array of strings; one per Cluster UUID.
 */
export function getClusterUuids(server, callCluster, start, end) {
  return fetchClusterUuids(server, callCluster, start, end)
    .then(handleClusterUuidsResponse);
}

/**
 * Fetch the aggregated Cluster UUIDs from the monitoring cluster.
 *
 * @param {Object} server The server instance
 * @param {function} callCluster The callWithRequest or callWithInternalUser handler
 * @param {Date} start The start date to look for clusters
 * @param {Date} end The end date to look for clusters
 * @return {Promise} Object response from the aggregation.
 */
export function fetchClusterUuids(server, callCluster, start, end) {
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
            size: config.get('xpack.monitoring.max_bucket_size')
          }
        }
      }
    }
  };

  return callCluster('search', params);
}

/**
 * Convert the aggregation response into an array of Cluster UUIDs.
 *
 * @param {Object} response The aggregation response
 * @return {Array} Strings; each representing a Cluster's UUID.
 */
export function handleClusterUuidsResponse(response) {
  const uuidBuckets = get(response, 'aggregations.cluster_uuids.buckets', []);

  return uuidBuckets.map(uuidBucket => uuidBucket.key);
}
