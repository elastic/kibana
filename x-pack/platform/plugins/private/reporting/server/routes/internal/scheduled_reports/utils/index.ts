/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory } from '@kbn/core/server';
import type { ReportingCore } from '../../../..';

export const validateReportingLicense = async ({
  reporting,
  responseFactory,
}: {
  reporting: ReportingCore;
  responseFactory: KibanaResponseFactory;
}) => {
  // check license
  const licenseInfo = await reporting.getLicenseInfo();
  const licenseResults = licenseInfo.scheduledReports;

  if (!licenseResults.enableLinks) {
    throw responseFactory.forbidden({ body: licenseResults.message });
  }
};
