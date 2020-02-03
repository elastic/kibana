/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LicenseState, verifyApiAccessFactory } from './lib/license_state';

export function extendRouteWithLicenseCheck(route: any, licenseState: LicenseState) {
  const verifyApiAccessPreRouting = verifyApiAccessFactory(licenseState);

  const key = route.options ? 'options' : 'config';
  return {
    ...route,
    [key]: {
      ...route[key],
      pre: [verifyApiAccessPreRouting],
    },
  };
}
