/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import Boom from 'boom';
import mime from 'mime';
import {
  FrameworkRequest,
  FrameworkResponseToolkit,
  FrameworkResponseObject,
} from '../../libs/adapters/framework/adapter_types';
import { FleetServerLib } from '../../libs/types';

export const createGETArtifactsRoute = (libs: FleetServerLib) => ({
  method: 'GET',
  path: '/api/fleet/artifacts/{path*}',
  config: {
    auth: false,
    validate: {
      params: Joi.object({
        path: Joi.string()
          .regex(/^beats\//)
          .max(100),
      }),
    },
  },
  handler: async (
    request: FrameworkRequest<{ params: { path: string } }>,
    h: FrameworkResponseToolkit
  ): Promise<FrameworkResponseObject> => {
    const { path } = request.params;
    const contentType = mime.getType(path);
    if (!contentType) {
      throw Boom.badRequest('Unsuported file type');
    }
    const stream = await libs.artifacts.download(request.params.path);
    const response = h.response(stream).header('content-type', contentType);

    return response;
  },
});
