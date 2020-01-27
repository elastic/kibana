/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQuery } from '../create_query';
import { LogstashMetric } from '../metrics';

function scalarCounterAggregation(field, fieldPath, ephemeralIdField, maxBucketSize) {
  const fullPath = `${fieldPath}.${field}`;

  const byEphemeralIdName = `${field}_temp_by_ephemeral_id`;
  const sumName = `${field}_total`;

  const aggs = {};

  aggs[byEphemeralIdName] = {
    terms: {
      field: ephemeralIdField,
      size: maxBucketSize,
    },
    aggs: {
      stats: {
        stats: { field: fullPath },
      },
      difference: {
        bucket_script: {
          script: 'params.max - params.min',
          buckets_path: {
            min: 'stats.min',
            max: 'stats.max',
          },
        },
      },
    },
  };

  aggs[sumName] = {
    sum_bucket: {
      buckets_path: `${byEphemeralIdName}>difference`,
    },
  };

  return aggs;
}

function nestedVertices(maxBucketSize) {
  const fieldPath = 'logstash_stats.pipelines.vertices';
  const ephemeralIdField = 'logstash_stats.pipelines.vertices.pipeline_ephemeral_id';

  return {
    nested: { path: 'logstash_stats.pipelines.vertices' },
    aggs: {
      vertex_id: {
        terms: {
          field: 'logstash_stats.pipelines.vertices.id',
          size: maxBucketSize,
        },
        aggs: {
          ...scalarCounterAggregation('events_in', fieldPath, ephemeralIdField, maxBucketSize),
          ...scalarCounterAggregation('events_out', fieldPath, ephemeralIdField, maxBucketSize),
          ...scalarCounterAggregation(
            'duration_in_millis',
            fieldPath,
            ephemeralIdField,
            maxBucketSize
          ),
        },
      },
    },
  };
}

function createScopedAgg(pipelineId, pipelineHash, agg) {
  return {
    pipelines: {
      nested: { path: 'logstash_stats.pipelines' },
      aggs: {
        scoped: {
          filter: {
            bool: {
              filter: [
                { term: { 'logstash_stats.pipelines.id': pipelineId } },
                { term: { 'logstash_stats.pipelines.hash': pipelineHash } },
              ],
            },
          },
          aggs: agg,
        },
      },
    },
  };
}

function fetchPipelineLatestStats(
  query,
  logstashIndexPattern,
  pipelineId,
  version,
  maxBucketSize,
  callWithRequest,
  req
) {
  const params = {
    index: logstashIndexPattern,
    size: 0,
    ignoreUnavailable: true,
    filterPath: [
      'aggregations.pipelines.scoped.vertices.vertex_id.buckets.key',
      'aggregations.pipelines.scoped.vertices.vertex_id.buckets.events_in_total',
      'aggregations.pipelines.scoped.vertices.vertex_id.buckets.events_out_total',
      'aggregations.pipelines.scoped.vertices.vertex_id.buckets.duration_in_millis_total',
      'aggregations.pipelines.scoped.total_processor_duration_stats',
    ],
    body: {
      query: query,
      aggs: createScopedAgg(pipelineId, version.hash, {
        vertices: nestedVertices(maxBucketSize),
        total_processor_duration_stats: {
          stats: {
            field: 'logstash_stats.pipelines.events.duration_in_millis',
          },
        },
      }),
    },
  };

  return callWithRequest(req, 'search', params);
}

export function getPipelineStatsAggregation(
  req,
  logstashIndexPattern,
  timeseriesInterval,
  { clusterUuid, start, end, pipelineId, version }
) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const filters = [
    {
      nested: {
        path: 'logstash_stats.pipelines',
        query: {
          bool: {
            must: [
              { term: { 'logstash_stats.pipelines.hash': version.hash } },
              { term: { 'logstash_stats.pipelines.id': pipelineId } },
            ],
          },
        },
      },
    },
  ];

  start = version.lastSeen - timeseriesInterval * 1000;
  end = version.lastSeen;

  const query = createQuery({
    type: 'logstash_stats',
    start,
    end,
    metric: LogstashMetric.getMetricFields(),
    clusterUuid,
    filters,
  });

  const config = req.server.config();

  return fetchPipelineLatestStats(
    query,
    logstashIndexPattern,
    pipelineId,
    version,
    config.get('xpack.monitoring.max_bucket_size'),
    callWithRequest,
    req
  );
}
