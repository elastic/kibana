/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
} from 'src/core/server';
import { PLUGIN_ID } from './plugin';

export const licensePreRoutingFactory = (
  xpackMainPlugin: any,
  handler: RequestHandler<any, any, any>
): RequestHandler<any, any, any> => {
  // License checking and enable/disable logic
  return function licensePreRouting(
    ctx: RequestHandlerContext,
    request: KibanaRequest,
    response: KibanaResponseFactory
  ) {
    const licenseCheckResults = xpackMainPlugin.info.feature(PLUGIN_ID).getLicenseCheckResults();

    if (!licenseCheckResults.isAvailable) {
      return response.customError({
        body: {
          message: licenseCheckResults.message,
        },
        statusCode: 403,
      });
    }

    return handler(ctx, request, response);
  };
};
