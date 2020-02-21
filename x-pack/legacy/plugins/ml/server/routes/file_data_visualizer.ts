/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandlerContext } from 'kibana/server';
import { MAX_BYTES } from '../../common/constants/file_datavisualizer';
import { wrapError } from '../client/error_wrapper';
import {
  InputOverrides,
  InputData,
  fileDataVisualizerProvider,
  importDataProvider,
  Settings,
  InjectPipeline,
  Mappings,
} from '../models/file_data_visualizer';

import { licensePreRoutingFactory } from '../new_platform/licence_check_pre_routing_factory';
import { RouteInitialization } from '../new_platform/plugin';
import { incrementFileDataVisualizerIndexCreationCount } from '../lib/ml_telemetry';

function analyzeFiles(context: RequestHandlerContext, data: InputData, overrides: InputOverrides) {
  const { analyzeFile } = fileDataVisualizerProvider(context);
  return analyzeFile(data, overrides);
}

function importData(
  context: RequestHandlerContext,
  id: string,
  index: string,
  settings: Settings,
  mappings: Mappings,
  ingestPipeline: InjectPipeline,
  data: InputData
) {
  const { importData: importDataFunc } = importDataProvider(context);
  return importDataFunc(id, index, settings, mappings, ingestPipeline, data);
}

/**
 * Routes for the file data visualizer.
 */
export function fileDataVisualizerRoutes({
  router,
  xpackMainPlugin,
  savedObjects,
  elasticsearchPlugin,
}: RouteInitialization) {
  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /api/ml/file_data_visualizer/analyze_file Analyze file data
   * @apiName AnalyzeFile
   * @apiDescription Performs analysis of the file data.
   */
  router.post(
    {
      path: '/api/ml/file_data_visualizer/analyze_file',
      validate: {
        body: schema.any(),
        query: schema.maybe(
          schema.object({
            charset: schema.maybe(schema.string()),
            column_names: schema.maybe(schema.string()),
            delimiter: schema.maybe(schema.string()),
            explain: schema.maybe(schema.string()),
            format: schema.maybe(schema.string()),
            grok_pattern: schema.maybe(schema.string()),
            has_header_row: schema.maybe(schema.string()),
            line_merge_size_limit: schema.maybe(schema.string()),
            lines_to_sample: schema.maybe(schema.string()),
            quote: schema.maybe(schema.string()),
            should_trim_fields: schema.maybe(schema.string()),
            timeout: schema.maybe(schema.string()),
            timestamp_field: schema.maybe(schema.string()),
            timestamp_format: schema.maybe(schema.string()),
          })
        ),
      },
      options: {
        body: {
          accepts: ['text/*', 'application/json'],
          maxBytes: MAX_BYTES,
        },
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const result = await analyzeFiles(context, request.body, request.query);
        return response.ok({ body: result });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /api/ml/file_data_visualizer/import Import file data
   * @apiName ImportFile
   * @apiDescription Imports file data into elasticsearch index.
   */
  router.post(
    {
      path: '/api/ml/file_data_visualizer/import',
      validate: {
        query: schema.object({
          id: schema.maybe(schema.string()),
        }),
        body: schema.object({
          index: schema.maybe(schema.string()),
          data: schema.arrayOf(schema.any()),
          settings: schema.maybe(schema.any()),
          mappings: schema.any(),
          ingestPipeline: schema.object({
            id: schema.maybe(schema.string()),
            pipeline: schema.maybe(schema.any()),
          }),
        }),
      },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: MAX_BYTES,
        },
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { id } = request.query;
        const { index, data, settings, mappings, ingestPipeline } = request.body;

        // `id` being `undefined` tells us that this is a new import due to create a new index.
        // follow-up import calls to just add additional data will include the `id` of the created
        // index, we'll ignore those and don't increment the counter.
        if (id === undefined) {
          await incrementFileDataVisualizerIndexCreationCount(elasticsearchPlugin, savedObjects!);
        }

        const result = await importData(
          context,
          id,
          index,
          settings,
          mappings,
          ingestPipeline,
          data
        );
        return response.ok({ body: result });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
