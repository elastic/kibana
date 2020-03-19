/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'src/core/server';
import { PLUGIN } from '../../../../common/constants';

export const licensePreRoutingFactory = <P, Q, B>({
  __LEGACY,
  requestHandler,
}: {
  __LEGACY: { server: any };
  requestHandler: RequestHandler<P, Q, B>;
}) => {
  const xpackMainPlugin = __LEGACY.server.plugins.xpack_main;

  // License checking and enable/disable logic
  const licensePreRouting: RequestHandler<P, Q, B> = (ctx, request, response) => {
    const licenseCheckResults = xpackMainPlugin.info.feature(PLUGIN.ID).getLicenseCheckResults();
    if (!licenseCheckResults.isAvailable) {
      return response.forbidden({
        body: licenseCheckResults.message,
      });
    } else {
      return requestHandler(ctx, request, response);
    }
  };

  return licensePreRouting;
};
