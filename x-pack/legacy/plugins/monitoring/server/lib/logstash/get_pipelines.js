/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { cloneDeep, last } from 'lodash';
import { checkParam } from '../error_missing_required';
import { getMetrics } from '../details/get_metrics';

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
      nodesCount: {
        ...pipeline.metrics[nodesCountMetricKey],
        data: pipeline.metrics[nodesCountMetricKey].data.map(item => [
          item[0],
          item[1][pipeline.id],
        ]),
      },
    };

    pipeline.latestThroughput = last(pipeline.metrics.throughput.data)[1];
    pipeline.latestNodesCount = last(pipeline.metrics.nodesCount.data)[1];
  });

  return processedResponse;
}

export async function getPipelines(req, logstashIndexPattern, pipelines, metricSet) {
  checkParam(logstashIndexPattern, 'logstashIndexPattern in logstash/getPipelines');
  checkParam(metricSet, 'metricSet in logstash/getPipelines');

  const filters = [];

  const metricsResponse = await Promise.all(
    pipelines.map(pipeline => {
      return new Promise(async resolve => {
        const data = await getMetrics(req, logstashIndexPattern, metricSet, filters, {
          pipeline,
        });

        resolve({
          id: pipeline.id,
          metrics: Object.keys(data).reduce((accum, metricName) => {
            accum[metricName] = data[metricName][0];
            return accum;
          }, {}),
        });
      });
    })
  );

  return Object.values(metricsResponse);
}
