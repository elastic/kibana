/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { capabilities as uiCapabilities } from 'ui/capabilities';

interface IntegratedAppsAvailability {
  [key: string]: boolean;
}

export const getIntegratedAppAvailability = (
  integratedApps: string[]
): IntegratedAppsAvailability => {
  const capabilities = uiCapabilities.get();
  return integratedApps.reduce((supportedSolutions: IntegratedAppsAvailability, solutionName) => {
    supportedSolutions[solutionName] =
      capabilities[solutionName] && capabilities[solutionName].show === true;
    return supportedSolutions;
  }, {});
};
