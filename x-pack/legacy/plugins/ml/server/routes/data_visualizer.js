/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { DataVisualizer } from '../models/data_visualizer';

function getOverallStats(
  callWithRequest,
  indexPatternTitle,
  query,
  aggregatableFields,
  nonAggregatableFields,
  samplerShardSize,
  timeFieldName,
  earliestMs,
  latestMs
) {
  const dv = new DataVisualizer(callWithRequest);
  return dv.getOverallStats(
    indexPatternTitle,
    query,
    aggregatableFields,
    nonAggregatableFields,
    samplerShardSize,
    timeFieldName,
    earliestMs,
    latestMs
  );
}

function getStatsForFields(
  callWithRequest,
  indexPatternTitle,
  query,
  fields,
  samplerShardSize,
  timeFieldName,
  earliestMs,
  latestMs,
  interval,
  maxExamples
) {
  const dv = new DataVisualizer(callWithRequest);
  return dv.getStatsForFields(
    indexPatternTitle,
    query,
    fields,
    samplerShardSize,
    timeFieldName,
    earliestMs,
    latestMs,
    interval,
    maxExamples
  );
}

export function dataVisualizerRoutes({ commonRouteConfig, elasticsearchPlugin, route }) {
  route({
    method: 'POST',
    path: '/api/ml/data_visualizer/get_field_stats/{indexPatternTitle}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const indexPatternTitle = request.params.indexPatternTitle;
      const payload = request.payload;
      return getStatsForFields(
        callWithRequest,
        indexPatternTitle,
        payload.query,
        payload.fields,
        payload.samplerShardSize,
        payload.timeFieldName,
        payload.earliest,
        payload.latest,
        payload.interval,
        payload.maxExamples
      ).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/data_visualizer/get_overall_stats/{indexPatternTitle}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const indexPatternTitle = request.params.indexPatternTitle;
      const payload = request.payload;
      return getOverallStats(
        callWithRequest,
        indexPatternTitle,
        payload.query,
        payload.aggregatableFields,
        payload.nonAggregatableFields,
        payload.samplerShardSize,
        payload.timeFieldName,
        payload.earliest,
        payload.latest
      ).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });
}
