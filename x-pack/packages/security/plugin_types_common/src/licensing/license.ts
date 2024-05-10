/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

import type { LicenseType } from '@kbn/licensing-plugin/common/types';

import type { SecurityLicenseFeatures } from './license_features';

export interface SecurityLicense {
  isLicenseAvailable(): boolean;
  getUnavailableReason: () => string | undefined;
  isEnabled(): boolean;
  getFeatures(): SecurityLicenseFeatures;
  hasAtLeast(licenseType: LicenseType): boolean | undefined;
  features$: Observable<SecurityLicenseFeatures>;
}
