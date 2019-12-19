/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Bluebird from 'bluebird';
import { contains, get } from 'lodash';
import { checkParam } from '../error_missing_required';
import { createQuery } from '../create_query';
import { ElasticsearchMetric } from '../metrics';
import { ML_SUPPORTED_LICENSES } from '../../../common/constants';

/*
 * Get a listing of jobs along with some metric data to use for the listing
 */
export function handleResponse(response) {
  const hits = get(response, 'hits.hits', []);
  return hits.map(hit => get(hit, '_source.job_stats'));
}

export function getMlJobs(req, esIndexPattern) {
  checkParam(esIndexPattern, 'esIndexPattern in getMlJobs');

  const config = req.server.config();
  const maxBucketSize = config.get('xpack.monitoring.max_bucket_size');
  const start = req.payload.timeRange.min; // no wrapping in moment :)
  const end = req.payload.timeRange.max;
  const clusterUuid = req.params.clusterUuid;
  const metric = ElasticsearchMetric.getMetricFields();
  const params = {
    index: esIndexPattern,
    size: maxBucketSize,
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._source.job_stats.job_id',
      'hits.hits._source.job_stats.state',
      'hits.hits._source.job_stats.data_counts.processed_record_count',
      'hits.hits._source.job_stats.model_size_stats.model_bytes',
      'hits.hits._source.job_stats.forecasts_stats.total',
      'hits.hits._source.job_stats.node.id',
      'hits.hits._source.job_stats.node.name',
    ],
    body: {
      sort: { timestamp: { order: 'desc' } },
      collapse: { field: 'job_stats.job_id' },
      query: createQuery({ type: 'job_stats', start, end, clusterUuid, metric }),
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then(handleResponse);
}

/*
 * cardinality isn't guaranteed to be accurate is the issue
 * but it will be as long as the precision threshold is >= the actual value
 */
export function getMlJobsForCluster(req, esIndexPattern, cluster) {
  const license = get(cluster, 'license', {});

  if (license.status === 'active' && contains(ML_SUPPORTED_LICENSES, license.type)) {
    // ML is supported
    const start = req.payload.timeRange.min; // no wrapping in moment :)
    const end = req.payload.timeRange.max;
    const clusterUuid = req.params.clusterUuid;
    const metric = ElasticsearchMetric.getMetricFields();
    const params = {
      index: esIndexPattern,
      size: 0,
      ignoreUnavailable: true,
      filterPath: 'aggregations.jobs_count.value',
      body: {
        query: createQuery({ type: 'job_stats', start, end, clusterUuid, metric }),
        aggs: {
          jobs_count: { cardinality: { field: 'job_stats.job_id' } },
        },
      },
    };

    const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

    return callWithRequest(req, 'search', params).then(response => {
      return get(response, 'aggregations.jobs_count.value', 0);
    });
  }

  // ML is not supported
  return Bluebird.resolve(null);
}
