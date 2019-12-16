/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { filter } from '../pagination/filter';
import { getLogstashPipelineIds } from './get_pipeline_ids';
import { handleGetPipelinesResponse } from './get_pipelines';
import { sortPipelines } from './sort_pipelines';
import { paginate } from '../pagination/paginate';
import { getMetrics } from '../details/get_metrics';

/**
 * This function performs an optimization around the pipeline listing tables in the UI. To avoid
 * query performances in Elasticsearch (mainly thinking of `search.max_buckets` overflows), we do
 * not want to fetch all time-series data for all pipelines. Instead, we only want to fetch the
 * time-series data for the pipelines visible in the listing table. This function accepts
 * pagination/sorting/filtering data to determine which pipelines will be visible in the table
 * and returns that so the caller can perform their normal call to get the time-series data.
 *
 * @param {*} req - Server request object
 * @param {*} lsIndexPattern - The index pattern to search against (`.monitoring-logstash-*`)
 * @param {*} uuids - The optional `clusterUuid` and `logstashUuid` to filter the results from
 * @param {*} metricSet - The array of metrics that are sortable in the UI
 * @param {*} pagination - ({ index, size })
 * @param {*} sort - ({ field, direction })
 * @param {*} queryText - Text that will be used to filter out pipelines
 */
export async function getPaginatedPipelines(
  req,
  lsIndexPattern,
  { clusterUuid, logstashUuid },
  metricSet,
  pagination,
  sort,
  queryText
) {
  const config = req.server.config();
  const size = config.get('xpack.monitoring.max_bucket_size');
  const pipelines = await getLogstashPipelineIds(
    req,
    lsIndexPattern,
    { clusterUuid, logstashUuid },
    size
  );

  // `metricSet` defines a list of metrics that are sortable in the UI
  // but we don't need to fetch all the data for these metrics to perform
  // the necessary sort - we only need the last bucket of data so we
  // fetch the last two buckets of data (to ensure we have a single full bucekt),
  // then return the value from that last bucket
  const metricSeriesData = await getMetrics(
    req,
    lsIndexPattern,
    metricSet,
    [],
    { pageOfPipelines: pipelines },
    2
  );
  const pipelineAggregationsData = handleGetPipelinesResponse(
    metricSeriesData,
    pipelines.map(p => p.id)
  );
  for (const pipelineAggregationData of pipelineAggregationsData) {
    for (const pipeline of pipelines) {
      if (pipelineAggregationData.id === pipeline.id) {
        for (const metric of metricSet) {
          const dataSeries = get(pipelineAggregationData, `metrics.${metric}.data`, [[]]);
          pipeline[metric] = dataSeries[dataSeries.length - 1][1];
        }
      }
    }
  }

  // Manually apply pagination/sorting/filtering concerns

  // Filtering
  const filteredPipelines = filter(pipelines, queryText, ['id']); // We only support filtering by id right now

  // Sorting
  const sortedPipelines = sortPipelines(filteredPipelines, sort);

  // Pagination
  const pageOfPipelines = paginate(pagination, sortedPipelines);

  return {
    pageOfPipelines,
    totalPipelineCount: filteredPipelines.length,
  };
}
