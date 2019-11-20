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
import { PLUGIN } from '../../../../common/constants';
import { LICENSE_STATUS_VALID } from '../../../../../../common/constants/license_status';
import { ServerShimWithRouter } from '../../types';

export const licensePreRoutingFactory = (
  server: ServerShimWithRouter,
  handler: RequestHandler
): RequestHandler => {
  const xpackMainPlugin = server.plugins.xpack_main;

  // License checking and enable/disable logic
  return function licensePreRouting(
    ctx: RequestHandlerContext,
    request: KibanaRequest,
    response: KibanaResponseFactory
  ) {
    const licenseCheckResults = xpackMainPlugin.info.feature(PLUGIN.ID).getLicenseCheckResults();
    const { status } = licenseCheckResults;

    if (status !== LICENSE_STATUS_VALID) {
      return response.customError({
        body: {
          message: licenseCheckResults.messsage,
        },
        statusCode: 403,
      });
    }

    return handler(ctx, request, response);
  };
};
