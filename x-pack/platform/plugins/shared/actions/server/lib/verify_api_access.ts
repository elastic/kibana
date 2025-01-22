/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ILicenseState } from './license_state';

export function verifyApiAccess(licenseState: ILicenseState) {
  const licenseCheckResults = licenseState.getLicenseInformation();

  if (licenseCheckResults.showAppLink && licenseCheckResults.enableAppLink) {
    return null;
  }

  throw Boom.forbidden(licenseCheckResults.message);
}
