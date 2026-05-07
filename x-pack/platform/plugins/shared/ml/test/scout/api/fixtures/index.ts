/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import type { RoleSessionCredentials, SamlAuth } from '@kbn/scout';
import { ML_USERS } from './constants';

export interface MlSamlAuthFixture extends SamlAuth {
  asMlPoweruser: () => Promise<RoleSessionCredentials>;
  asMlViewer: () => Promise<RoleSessionCredentials>;
  asMlUnauthorized: () => Promise<RoleSessionCredentials>;
}

export const mlApiTest = apiTest.extend<{
  samlAuth: MlSamlAuthFixture;
}>({
  samlAuth: async ({ samlAuth }, use) => {
    const extendedSamlAuth: MlSamlAuthFixture = {
      ...samlAuth,
      asMlPoweruser: () => samlAuth.asInteractiveUser(ML_USERS.mlPoweruser),
      asMlViewer: () => samlAuth.asInteractiveUser(ML_USERS.mlViewer),
      asMlUnauthorized: () => samlAuth.asInteractiveUser(ML_USERS.mlUnauthorized),
    };
    await use(extendedSamlAuth);
  },
});

export { ML_USERS, COMMON_HEADERS, INTERNAL_API_HEADERS, PUBLIC_API_HEADERS } from './constants';
