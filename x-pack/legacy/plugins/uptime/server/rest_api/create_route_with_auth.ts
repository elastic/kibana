/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'kibana/server';
import { ObjectType } from '@kbn/config-schema';
import { UMServerLibs } from '../lib/lib';
import { UMRestApiRouteCreator, UMRouteDefinition } from './types';

export const createRouteWithAuth = (
  libs: UMServerLibs,
  routeCreator: UMRestApiRouteCreator
): UMRouteDefinition => {
  const restRoute = routeCreator(libs);
  const { handler, method, path, options, ...rest } = restRoute;
  const authHandler: RequestHandler<ObjectType, ObjectType, ObjectType> = async (
    context,
    request,
    response
  ) => {
    if (libs.license(context.licensing.license)) {
      return await handler(context, request, response);
    }
    return response.badRequest();
  };
  return {
    method,
    path,
    options,
    handler: authHandler,
    ...rest,
  };
};
