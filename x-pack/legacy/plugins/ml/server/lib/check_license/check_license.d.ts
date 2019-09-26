/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LICENSE_TYPE } from '../../../common/constants/license';
interface Response {
  isAvailable: boolean;
  showLinks: boolean;
  enableLinks: boolean;
  licenseType: LICENSE_TYPE;
  hasExpired: boolean;
  message: string;
}

export function checkLicense(xpackLicenseInfo: any): Response;
