/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LICENSE_TOO_LOW } from '../../../common/translations/errors';

export interface OsqueryActiveLicenses {
  isActivePlatinumLicense: boolean;
}

export const validateLicense = (license?: OsqueryActiveLicenses) => {
  if (!license) {
    return;
  }

  const { isActivePlatinumLicense } = license;

  if (!isActivePlatinumLicense) {
    return LICENSE_TOO_LOW;
  }
};
