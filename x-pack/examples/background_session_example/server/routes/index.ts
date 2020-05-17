/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import {
  IRouter,
  KibanaRequest,
  RequestHandlerContext,
  KibanaResponseFactory,
} from '../../../../../src/core/server';
import { backgroundSessionRouteHandler, DemoBody } from './route_handler';

export function defineRoutes(router: IRouter) {
  router.post(
    {
      path: '/api/background_session_example/example',
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (
      context: RequestHandlerContext,
      request: KibanaRequest<unknown, unknown, DemoBody>,
      response: KibanaResponseFactory
    ) => {
      return await backgroundSessionRouteHandler(context.backgroundSession!, request, response);
    }
  );
}
