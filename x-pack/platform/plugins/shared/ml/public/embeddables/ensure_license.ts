/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlCapabilities } from '@kbn/ml-common-types/capabilities';
import { isFullLicense } from '../../common/license';
import type { MlCoreSetup } from '../plugin';

export async function ensureLicense(getStartServices: MlCoreSetup['getStartServices']) {
  const [coreStart, pluginStart] = await getStartServices();
  const license = await pluginStart.licensing.getLicense();
  if (
    !isFullLicense(license) ||
    !(coreStart.application.capabilities.ml as MlCapabilities).canGetMlInfo
  ) {
    throw new Error('Invalid license');
  }
}
