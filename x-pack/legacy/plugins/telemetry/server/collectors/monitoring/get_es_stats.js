/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../../monitoring/common/constants';

/**
 * Get statistics for all selected Elasticsearch clusters.
 *
 * @param {Object} server The server instance
 * @param {function} callCluster The callWithRequest or callWithInternalUser handler
 * @param {Array} clusterUuids The string Cluster UUIDs to fetch details for
 * @return {Promise} Array of the Elasticsearch clusters.
 */
export function getElasticsearchStats(server, callCluster, clusterUuids) {
  return fetchElasticsearchStats(server, callCluster, clusterUuids)
    .then(handleElasticsearchStats);
}

/**
 * Fetch the Elasticsearch stats.
 *
 * @param {Object} server The server instance
 * @param {function} callCluster The callWithRequest or callWithInternalUser handler
 * @param {Array} clusterUuids Cluster UUIDs to limit the request against
 * @return {Promise} Response for the aggregations to fetch details for the product.
 */
export function fetchElasticsearchStats(server, callCluster, clusterUuids) {
  const config = server.config();
  const params = {
    index: INDEX_PATTERN_ELASTICSEARCH,
    size: config.get('xpack.monitoring.max_bucket_size'),
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._source.cluster_uuid',
      'hits.hits._source.timestamp',
      'hits.hits._source.cluster_name',
      'hits.hits._source.version',
      'hits.hits._source.license.status', // license data only includes necessary fields to drive UI
      'hits.hits._source.license.type',
      'hits.hits._source.license.issue_date',
      'hits.hits._source.license.expiry_date',
      'hits.hits._source.license.expiry_date_in_millis',
      'hits.hits._source.cluster_stats',
      'hits.hits._source.stack_stats'
    ],
    body: {
      query: {
        bool: {
          filter: [
            /*
             * Note: Unlike most places, we don't care about the old _type: cluster_stats because it would NOT
             * have the license in it (that used to be in the .monitoring-data-2 index in cluster_info)
             */
            { term: { type: 'cluster_stats' } },
            { terms: { cluster_uuid: clusterUuids } }
          ]
        }
      },
      collapse: { field: 'cluster_uuid' },
      sort: { timestamp: { order: 'desc' } }
    }
  };

  return callCluster('search', params);
}

/**
 * Extract the cluster stats for each cluster.
 *
 * @return {Array} The Elasticsearch clusters.
 */
export function handleElasticsearchStats(response) {
  const clusters = get(response, 'hits.hits', []);

  return clusters.map(cluster => cluster._source);
}
