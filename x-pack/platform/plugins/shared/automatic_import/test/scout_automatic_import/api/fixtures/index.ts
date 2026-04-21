/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import type { RoleSessionCredentials, ApiServicesFixture, SamlAuth } from '@kbn/scout';
import type { AutoImportApiService } from '../services/automatic_import_api_service';
import { getAutoImportApiService } from '../services/automatic_import_api_service';
import { AUTO_IMPORT_USERS } from './constants';

export interface AutoImportSamlAuthFixture extends SamlAuth {
  asAutoImportManager: () => Promise<RoleSessionCredentials>;
  asAutoImportReader: () => Promise<RoleSessionCredentials>;
  asAutoImportNoAccess: () => Promise<RoleSessionCredentials>;
}

export interface AutoImportApiServicesFixture extends ApiServicesFixture {
  autoImport: AutoImportApiService;
}

export const autoImportApiTest = apiTest.extend<{
  samlAuth: AutoImportSamlAuthFixture;
  apiServices: AutoImportApiServicesFixture;
}>({
  samlAuth: async ({ samlAuth }, use) => {
    const extendedSamlAuth: AutoImportSamlAuthFixture = {
      ...samlAuth,
      asAutoImportManager: () => samlAuth.asInteractiveUser(AUTO_IMPORT_USERS.autoImportManager),
      asAutoImportReader: () => samlAuth.asInteractiveUser(AUTO_IMPORT_USERS.autoImportReader),
      asAutoImportNoAccess: () => samlAuth.asInteractiveUser(AUTO_IMPORT_USERS.autoImportNoAccess),
    };
    await use(extendedSamlAuth);
  },

  apiServices: async ({ apiServices, kbnClient }, use) => {
    const extendedApiServices = apiServices as AutoImportApiServicesFixture;
    extendedApiServices.autoImport = getAutoImportApiService(kbnClient);
    await use(extendedApiServices);
  },
});

export { AUTO_IMPORT_USERS, COMMON_API_HEADERS } from './constants';
