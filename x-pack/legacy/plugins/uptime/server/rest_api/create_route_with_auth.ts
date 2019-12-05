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
  const licenseCheckHandler: RequestHandler<ObjectType, ObjectType, ObjectType> = async (
    context,
    request,
    response
  ) => {
    const { statusCode, message } = libs.license(context.licensing.license);
    if (statusCode === 200) {
      return await handler(context, request, response);
    }
    switch (statusCode) {
      case 400:
        return response.badRequest({ body: { message } });
      case 401:
        return response.unauthorized({ body: message });
      case 403:
        return response.forbidden({ body: message });
      default:
        return response.internalError();
    }
  };
  return {
    method,
    path,
    options,
    handler: licenseCheckHandler,
    ...rest,
  };
};
