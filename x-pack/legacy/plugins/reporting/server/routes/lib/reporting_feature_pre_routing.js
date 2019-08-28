/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { oncePerServer } from '../../lib/once_per_server';

function reportingFeaturePreRoutingFn(server) {
  const xpackMainPlugin = server.plugins.xpack_main;
  const pluginId = 'reporting';

  // License checking and enable/disable logic
  return function reportingFeaturePreRouting(getReportingFeatureId) {
    return function licensePreRouting(request) {
      const licenseCheckResults = xpackMainPlugin.info.feature(pluginId).getLicenseCheckResults();
      const reportingFeatureId = getReportingFeatureId(request);
      const reportingFeature = licenseCheckResults[reportingFeatureId];
      if (!reportingFeature.showLinks || !reportingFeature.enableLinks) {
        throw Boom.forbidden(reportingFeature.message);
      } else {
        return reportingFeature;
      }
    };
  };
}

export const reportingFeaturePreRoutingFactory = oncePerServer(reportingFeaturePreRoutingFn);
