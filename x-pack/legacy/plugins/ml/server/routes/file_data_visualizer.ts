/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandlerContext } from 'kibana/server';
import { wrapError } from '../client/error_wrapper';
import {
  InputOverrides,
  InputData,
  fileDataVisualizerProvider,
} from '../models/file_data_visualizer';

import { licensePreRoutingFactory } from '../new_platform/licence_check_pre_routing_factory';
import { RouteInitialization } from '../new_platform/plugin';

function analyzeFiles(context: RequestHandlerContext, data: InputData, overrides: InputOverrides) {
  const { analyzeFile } = fileDataVisualizerProvider(context);
  return analyzeFile(data, overrides);
}

export function fileDataVisualizerRoutes({ router, xpackMainPlugin }: RouteInitialization) {
  router.post(
    {
      path: '/api/ml/file_data_visualizer/analyze_file',
      validate: {
        body: schema.any(),
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
}
