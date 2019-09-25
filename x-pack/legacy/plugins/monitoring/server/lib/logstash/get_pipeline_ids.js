/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { createQuery } from '../create_query';
import { LogstashMetric } from '../metrics';

export async function getLogstashPipelineIds(req, logstashIndexPattern, size) {
  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();

  const params = {
    index: logstashIndexPattern,
    size: 0,
    ignoreUnavailable: true,
    filterPath: [
      'aggregations.nested_context'
    ],
    body: {
      query: createQuery({
        start,
        end,
        metric: LogstashMetric.getMetricFields(),
        clusterUuid: req.params.clusterUuid,
      }),
      aggs: {
        nested_context: {
          nested: {
            path: 'logstash_stats.pipelines'
          },
          aggs: {
            pipelines: {
              terms: {
                field: 'logstash_stats.pipelines.id',
                size,
              }
            }
          }
        }
      }
    }
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params);
}
