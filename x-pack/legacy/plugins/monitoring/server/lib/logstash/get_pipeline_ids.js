/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { get, uniq } from 'lodash';
import { createQuery } from '../create_query';
import { LogstashMetric } from '../metrics';

export async function getLogstashPipelineIds(
  req,
  logstashIndexPattern,
  { clusterUuid, logstashUuid },
  size
) {
  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();

  const filters = [];
  if (logstashUuid) {
    filters.push({ term: { 'logstash_stats.logstash.uuid': logstashUuid } });
  }

  const params = {
    index: logstashIndexPattern,
    size: 0,
    ignoreUnavailable: true,
    filterPath: ['aggregations.nested_context.composite_data.buckets'],
    body: {
      query: createQuery({
        start,
        end,
        metric: LogstashMetric.getMetricFields(),
        clusterUuid,
        filters,
      }),
      aggs: {
        nested_context: {
          nested: {
            path: 'logstash_stats.pipelines',
          },
          aggs: {
            composite_data: {
              composite: {
                size,
                sources: [
                  {
                    id: {
                      terms: {
                        field: 'logstash_stats.pipelines.id',
                      },
                    },
                  },
                  {
                    hash: {
                      terms: {
                        field: 'logstash_stats.pipelines.hash',
                      },
                    },
                  },
                  {
                    ephemeral_id: {
                      terms: {
                        field: 'logstash_stats.pipelines.ephemeral_id',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);
  const data = get(response, 'aggregations.nested_context.composite_data.buckets', []).map(
    bucket => bucket.key
  );
  return uniq(data, item => item.id);
}
