/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MlCapabilities } from '../types';

export const hasMlUserPermissions = (capabilities: MlCapabilities): boolean => {
  const canRead =
    capabilities.isPlatinumOrTrialLicense &&
    capabilities.mlFeatureEnabledInSpace &&
    capabilities.capabilities.canGetJobs &&
    capabilities.capabilities.canGetDatafeeds &&
    capabilities.capabilities.canGetCalendars &&
    capabilities.capabilities.canFindFileStructure;
  return canRead;
};
