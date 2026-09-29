/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense, LicenseType } from '@kbn/licensing-types';

/** Action policies dispatch to Workflows, which require an active Enterprise license. */
export const ACTION_POLICIES_REQUIRED_LICENSE: LicenseType = 'enterprise';

/** Whether the license allows creating, updating, and enabling action policies. */
export const isActionPoliciesLicenseValid = (license: ILicense): boolean =>
  license.isActive && license.hasAtLeast(ACTION_POLICIES_REQUIRED_LICENSE);
