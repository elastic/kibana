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

function createAggsObjectFromAggsList(aggsList) {
  return aggsList.reduce((aggsSoFar, agg) => ({ ...aggsSoFar, ...agg }), {});
}

function createNestedVertexAgg(vertexId, maxBucketSize) {
  const fieldPath = 'logstash_stats.pipelines.vertices';
  const ephemeralIdField = 'logstash_stats.pipelines.vertices.pipeline_ephemeral_id';

  return {
    vertices: {
      nested: { path: 'logstash_stats.pipelines.vertices' },
      aggs: {
        vertex_id: {
          filter: {
            term: {
              'logstash_stats.pipelines.vertices.id': vertexId,
            },
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
            ...scalarCounterAggregation(
              'queue_push_duration_in_millis',
              fieldPath,
              ephemeralIdField,
              maxBucketSize
            ),
          },
        },
      },
    },
  };
}

function createTotalProcessorDurationStatsAgg() {
  return {
    total_processor_duration_stats: {
      stats: {
        field: 'logstash_stats.pipelines.events.duration_in_millis',
      },
    },
  };
}

function createScopedAgg(pipelineId, pipelineHash, ...aggsList) {
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
          aggs: createAggsObjectFromAggsList(aggsList),
        },
      },
    },
  };
}

function createTimeSeriesAgg(timeSeriesIntervalInSeconds, ...aggsList) {
  return {
    timeseries: {
      date_histogram: {
        field: 'timestamp',
        fixed_interval: timeSeriesIntervalInSeconds + 's',
      },
      aggs: createAggsObjectFromAggsList(aggsList),
    },
  };
}

function fetchPipelineVertexTimeSeriesStats(
  query,
  logstashIndexPattern,
  pipelineId,
  version,
  vertexId,
  timeSeriesIntervalInSeconds,
  maxBucketSize,
  callWithRequest,
  req
) {
  const aggs = {
    ...createTimeSeriesAgg(
      timeSeriesIntervalInSeconds,
      createScopedAgg(
        pipelineId,
        version.hash,
        createNestedVertexAgg(vertexId, maxBucketSize),
        createTotalProcessorDurationStatsAgg()
      )
    ),
  };

  const params = {
    index: logstashIndexPattern,
    size: 0,
    ignoreUnavailable: true,
    filterPath: [
      'aggregations.timeseries.buckets.key',
      'aggregations.timeseries.buckets.pipelines.scoped.vertices.vertex_id.events_in_total',
      'aggregations.timeseries.buckets.pipelines.scoped.vertices.vertex_id.events_out_total',
      'aggregations.timeseries.buckets.pipelines.scoped.vertices.vertex_id.duration_in_millis_total',
      'aggregations.timeseries.buckets.pipelines.scoped.vertices.vertex_id.queue_push_duration_in_millis_total',
      'aggregations.timeseries.buckets.pipelines.scoped.total_processor_duration_stats',
    ],
    body: {
      query: query,
      aggs,
    },
  };

  return callWithRequest(req, 'search', params);
}

export function getPipelineVertexStatsAggregation(
  req,
  logstashIndexPattern,
  timeSeriesIntervalInSeconds,
  { clusterUuid, start, end, pipelineId, version, vertexId }
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

  start = version.firstSeen;
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

  return fetchPipelineVertexTimeSeriesStats(
    query,
    logstashIndexPattern,
    pipelineId,
    version,
    vertexId,
    timeSeriesIntervalInSeconds,
    config.get('xpack.monitoring.max_bucket_size'),
    callWithRequest,
    req
  );
}
