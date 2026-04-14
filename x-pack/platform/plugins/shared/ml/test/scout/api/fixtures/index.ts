/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import type { RoleSessionCredentials, ApiServicesFixture, SamlAuth } from '@kbn/scout';
import type { MlPluginApiService } from '../services/ml_api_service';
import { getMlApiService } from '../services/ml_api_service';
import type { MlTestResourcesService } from '../services/ml_test_resources';
import { getMlTestResourcesService } from '../services/ml_test_resources';
import { ML_USERS } from './constants';

export interface MlSamlAuthFixture extends SamlAuth {
  asMlPoweruser: () => Promise<RoleSessionCredentials>;
  asMlViewer: () => Promise<RoleSessionCredentials>;
  asMlUnauthorized: () => Promise<RoleSessionCredentials>;
}

export interface MlApiServicesFixture extends ApiServicesFixture {
  mlApi: MlPluginApiService;
  mlTestResources: MlTestResourcesService;
}

export const mlApiTest = apiTest.extend<{
  samlAuth: MlSamlAuthFixture;
  apiServices: MlApiServicesFixture;
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

  apiServices: async ({ apiServices, kbnClient, esClient, log }, use) => {
    const extendedServices: MlApiServicesFixture = {
      ...apiServices,
      mlApi: getMlApiService({ kbnClient, esClient, log, scoutMlApi: apiServices.ml }),
      mlTestResources: getMlTestResourcesService({
        kbnClient,
        log,
        dataViews: apiServices.dataViews,
      }),
    };
    await use(extendedServices);
  },
});

export { ML_USERS, COMMON_HEADERS, INTERNAL_API_HEADERS, PUBLIC_API_HEADERS } from './constants';
