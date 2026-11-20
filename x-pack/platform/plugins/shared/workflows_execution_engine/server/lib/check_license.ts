/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';

export const checkLicense = async (licensing: LicensingPluginStart) => {
  const license = await licensing.getLicense();

  if (!license.isAvailable || !license.isActive) {
    throw new Error('License information is not available or license is inactive.');
  }

  if (!license.hasAtLeast('enterprise')) {
    throw new Error(
      'Your license does not support Workflows Execution Engine. Please upgrade to an Enterprise license.'
    );
  }
};
