/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Legacy } from 'kibana';
import { Logger, ServerFacade } from '../../../types';
import { ReportingSetupDeps } from '../../types';

export type GetReportingFeatureIdFn = (request: Legacy.Request) => string;

export const reportingFeaturePreRoutingFactory = function reportingFeaturePreRoutingFn(
  server: ServerFacade,
  plugins: ReportingSetupDeps,
  logger: Logger
) {
  const xpackMainPlugin = server.plugins.xpack_main;
  const pluginId = 'reporting';

  // License checking and enable/disable logic
  return function reportingFeaturePreRouting(getReportingFeatureId: GetReportingFeatureIdFn) {
    return function licensePreRouting(request: Legacy.Request) {
      const licenseCheckResults = xpackMainPlugin.info.feature(pluginId).getLicenseCheckResults();
      const reportingFeatureId = getReportingFeatureId(request) as string;
      const reportingFeature = licenseCheckResults[reportingFeatureId];
      if (!reportingFeature.showLinks || !reportingFeature.enableLinks) {
        throw Boom.forbidden(reportingFeature.message);
      } else {
        return reportingFeature;
      }
    };
  };
};
