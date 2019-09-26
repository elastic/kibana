/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { checkParam } from '../error_missing_required';
import { createQuery } from '../create_query';
import { ElasticsearchMetric } from '../metrics';
import { parseCrossClusterPrefix } from '../ccs_utils';
import { getClustersState } from './get_clusters_state';

/**
 * This will fetch the cluster stats and cluster state as a single object per cluster.
 *
 * @param  {Object} req The incoming user's request
 * @param  {String} esIndexPattern The Elasticsearch index pattern
 * @param  {String} clusterUuid (optional) If not undefined, getClusters will filter for a single cluster
 * @return {Promise} A promise containing an array of clusters.
 */
export function getClustersStats(req, esIndexPattern, clusterUuid) {
  return fetchClusterStats(req, esIndexPattern, clusterUuid)
    .then(response => handleClusterStats(response, req.server))
  // augment older documents (e.g., from 2.x - 5.4) with their cluster_state
    .then(clusters => getClustersState(req, esIndexPattern, clusters));
}

/**
* Query cluster_stats for all the cluster data
*
* @param {Object} req (required) - server request
* @param {String} esIndexPattern (required) - index pattern to use in searching for cluster_stats data
* @param {String} clusterUuid (optional) - if not undefined, getClusters filters for a single clusterUuid
* @return {Promise} Object representing each cluster.
 */
function fetchClusterStats(req, esIndexPattern, clusterUuid) {
  checkParam(esIndexPattern, 'esIndexPattern in getClusters');

  const config = req.server.config();
  // Get the params from the POST body for the request
  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;
  const metric = ElasticsearchMetric.getMetricFields();
  const params = {
    index: esIndexPattern,
    size: config.get('xpack.monitoring.max_bucket_size'),
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._index',
      'hits.hits._source.cluster_uuid',
      'hits.hits._source.cluster_name',
      'hits.hits._source.version',
      'hits.hits._source.license.status', // license data only includes necessary fields to drive UI
      'hits.hits._source.license.type',
      'hits.hits._source.license.issue_date',
      'hits.hits._source.license.expiry_date',
      'hits.hits._source.license.expiry_date_in_millis',
      'hits.hits._source.cluster_stats',
      'hits.hits._source.cluster_state',
      'hits.hits._source.cluster_settings.cluster.metadata.display_name'
    ],
    body: {
      query: createQuery({ type: 'cluster_stats', start, end, metric, clusterUuid }),
      collapse: {
        field: 'cluster_uuid'
      },
      sort: { timestamp: { order: 'desc' } }
    }
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params);
}

/**
 * Handle the {@code response} from {@code fetchClusterStats}.
 *
 * @param {Object} response The response from Elasticsearch.
 * @return {Array} Objects representing each cluster.
 */
export function handleClusterStats(response) {
  const hits = get(response, 'hits.hits', []);

  return hits.map(hit => {
    const cluster = get(hit, '_source');

    if (cluster) {
      const indexName = get(hit, '_index', '');
      const ccs = parseCrossClusterPrefix(indexName);

      // use CCS whenever we come across it so that we can avoid talking to other monitoring clusters whenever possible
      if (ccs) {
        cluster.ccs = ccs;
      }
    }

    return cluster;
  })
    .filter(Boolean);
}
