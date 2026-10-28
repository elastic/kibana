/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BrowserAuthFixture,
  PageObjects,
  ScoutPage,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import {
  getTransformApiService,
  type TransformApiService,
} from '../../api/services/transform_api_service';
import { TRANSFORM_USERS } from './constants';
import { TransformManagementPage, TransformWizardPage } from './page_objects';

export interface TransformBrowserAuthFixture extends BrowserAuthFixture {
  loginAsTransformManager: () => Promise<void>;
  loginAsTransformViewer: () => Promise<void>;
}

export interface ExtScoutTestFixtures extends ScoutTestFixtures {
  browserAuth: TransformBrowserAuthFixture;
  pageObjects: PageObjects & {
    transformManagement: TransformManagementPage;
    transformWizard: TransformWizardPage;
  };
}

export interface ExtScoutWorkerFixtures extends ScoutWorkerFixtures {
  apiServices: ScoutWorkerFixtures['apiServices'] & {
    transform: TransformApiService;
  };
}

export const test = baseTest.extend<ExtScoutTestFixtures, ExtScoutWorkerFixtures>({
  browserAuth: async (
    { browserAuth }: { browserAuth: BrowserAuthFixture },
    use: (browserAuth: TransformBrowserAuthFixture) => Promise<void>
  ) => {
    await use({
      ...browserAuth,
      loginAsTransformManager: () =>
        browserAuth.loginWithCustomRole(TRANSFORM_USERS.transformManager),
      loginAsTransformViewer: () =>
        browserAuth.loginWithCustomRole(TRANSFORM_USERS.transformViewerUser),
    });
  },

  pageObjects: async (
    { pageObjects, page }: { pageObjects: PageObjects; page: ScoutPage },
    use: (pageObjects: ExtScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      transformManagement: createLazyPageObject(TransformManagementPage, page),
      transformWizard: createLazyPageObject(TransformWizardPage, page),
    });
  },

  apiServices: [
    async ({ apiServices, esClient }, use) => {
      const extendedApiServices = apiServices as ExtScoutWorkerFixtures['apiServices'];
      extendedApiServices.transform = getTransformApiService(esClient);
      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});

export * as testData from './constants';
export * from './transform_configs';
export * from './assertions';
export * from './wizard_assertions';
