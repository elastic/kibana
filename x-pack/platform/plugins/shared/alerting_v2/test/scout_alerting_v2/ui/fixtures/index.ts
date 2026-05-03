/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as baseTest } from '@kbn/scout';
import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { extendPageObjects, type AlertingPageObjects } from './page_objects';
import { buildAlertingApiServices, type AlertingApiServicesFixture } from '../../api/fixtures';

export interface AlertingTestFixtures extends ScoutTestFixtures {
  pageObjects: AlertingPageObjects;
}

export interface UiWorkerFixtures extends ScoutWorkerFixtures {
  apiServices: AlertingApiServicesFixture;
}

export const test = baseTest.extend<AlertingTestFixtures, UiWorkerFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    await use(extendPageObjects(pageObjects, page));
  },
  apiServices: [
    async ({ apiServices, esClient, kbnClient, log }, use) => {
      const extended = apiServices as AlertingApiServicesFixture;
      extended.alertingV2 = buildAlertingApiServices({ esClient, kbnClient, log });
      await use(extended);
    },
    { scope: 'worker' },
  ],
});

export { ALL_ROLE, NO_ACCESS_ROLE, READ_ROLE } from '../../common/roles';
export { buildCreateRuleData } from '../../common/builders';
export * as testData from '../../common/constants';
