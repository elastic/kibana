/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { fileDataVisualizerProvider, importDataProvider } from '../models/file_data_visualizer';
import { MAX_BYTES } from '../../common/constants/file_datavisualizer';

import { incrementFileDataVisualizerIndexCreationCount } from '../lib/ml_telemetry/ml_telemetry';

function analyzeFiles(callWithRequest, data, overrides) {
  const { analyzeFile } = fileDataVisualizerProvider(callWithRequest);
  return analyzeFile(data, overrides);
}

function importData(callWithRequest, id, index, settings, mappings, ingestPipeline, data) {
  const { importData: importDataFunc } = importDataProvider(callWithRequest);
  return importDataFunc(id, index, settings, mappings, ingestPipeline, data);
}

export function fileDataVisualizerRoutes({
  commonRouteConfig,
  elasticsearchPlugin,
  route,
  savedObjects,
}) {
  route({
    method: 'POST',
    path: '/api/ml/file_data_visualizer/analyze_file',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const data = request.payload;

      return analyzeFiles(callWithRequest, data, request.query).catch(wrapError);
    },
    config: {
      ...commonRouteConfig,
      payload: { maxBytes: MAX_BYTES },
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/file_data_visualizer/import',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { id } = request.query;
      const { index, data, settings, mappings, ingestPipeline } = request.payload;

      // `id` being `undefined` tells us that this is a new import due to create a new index.
      // follow-up import calls to just add additional data will include the `id` of the created
      // index, we'll ignore those and don't increment the counter.
      if (id === undefined) {
        incrementFileDataVisualizerIndexCreationCount(elasticsearchPlugin, savedObjects);
      }

      return importData(callWithRequest, id, index, settings, mappings, ingestPipeline, data).catch(
        wrapError
      );
    },
    config: {
      ...commonRouteConfig,
      payload: { maxBytes: MAX_BYTES },
    },
  });
}
