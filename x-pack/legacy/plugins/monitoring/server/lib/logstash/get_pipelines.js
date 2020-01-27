/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { cloneDeep, last, omit } from 'lodash';
import { checkParam } from '../error_missing_required';
import { getMetrics } from '../details/get_metrics';

export function handleGetPipelinesResponse(response, exclusivePipelineIds) {
  const pipelinesById = {};

  const metrics = Object.keys(response);
  metrics.forEach(metric => {
    response[metric][0].data.forEach(([x, y]) => {
      const pipelineIds = Object.keys(y);
      pipelineIds.forEach(pipelineId => {
        if (exclusivePipelineIds && !exclusivePipelineIds.includes(pipelineId)) {
          return;
        }
        // Create new pipeline object if necessary
        if (!pipelinesById.hasOwnProperty(pipelineId)) {
          pipelinesById[pipelineId] = {
            metrics: {},
          };
        }
        const pipeline = pipelinesById[pipelineId];

        // Create new metric object in pipeline object if necessary
        if (!pipeline.metrics.hasOwnProperty(metric)) {
          // Clone the metric object from the response so we don't accidentally overwrite it
          // in the code further below. Also, reset data to empty array because we only want
          // to keep data "y" values specific to this pipeline
          pipeline.metrics[metric] = {
            ...omit(response[metric][0], 'data'),
            data: [],
          };
        }

        pipeline.metrics[metric].data.push([x, y[pipelineId]]);
      });
    });
  });

  // Convert pipelinesById map to array and preserve sorting
  const pipelines = [];
  if (exclusivePipelineIds) {
    for (const exclusivePipelineId of exclusivePipelineIds) {
      pipelines.push({
        id: exclusivePipelineId,
        ...pipelinesById[exclusivePipelineId],
      });
    }
  } else {
    Object.keys(pipelinesById).forEach(pipelineId => {
      pipelines.push({
        id: pipelineId,
        ...pipelinesById[pipelineId],
      });
    });
  }

  return pipelines;
}

export async function processPipelinesAPIResponse(
  response,
  throughputMetricKey,
  nodesCountMetricKey
) {
  // Clone to avoid mutating original response
  const processedResponse = cloneDeep(response);

  // Normalize metric names for shared component code
  // Calculate latest throughput and node count for each pipeline
  processedResponse.pipelines.forEach(pipeline => {
    pipeline.metrics = {
      throughput: pipeline.metrics[throughputMetricKey],
      nodesCount: pipeline.metrics[nodesCountMetricKey],
    };

    pipeline.latestThroughput = last(pipeline.metrics.throughput.data)[1];
    pipeline.latestNodesCount = last(pipeline.metrics.nodesCount.data)[1];
  });

  return processedResponse;
}

export async function getPipelines(
  req,
  logstashIndexPattern,
  pipelineIds,
  metricSet,
  metricOptions = {}
) {
  checkParam(logstashIndexPattern, 'logstashIndexPattern in logstash/getPipelines');
  checkParam(metricSet, 'metricSet in logstash/getPipelines');

  const filters = [];

  const metricsResponse = await getMetrics(
    req,
    logstashIndexPattern,
    metricSet,
    filters,
    metricOptions
  );
  return handleGetPipelinesResponse(metricsResponse, pipelineIds);
}
