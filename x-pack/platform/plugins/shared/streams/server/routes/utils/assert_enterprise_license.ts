/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden } from '@hapi/boom';
import { LicensingPluginStart } from '@kbn/licensing-plugin/server';

export const assertEnterpriseLicense = async (licensing: LicensingPluginStart): Promise<void> => {
  const hasCorrectLicense = (await licensing.getLicense()).hasAtLeast('enterprise');

  if (!hasCorrectLicense) {
    throw forbidden('Enterprise license or higher is needed to make use of this feature.');
  }
};
