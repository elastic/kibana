/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { AnonymizationSettingsPage } from '../../../scout/ui/fixtures/page_objects';

interface AnonymizationLicenseTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    anonymizationSettings: AnonymizationSettingsPage;
  };
}

export const test = baseTest.extend<AnonymizationLicenseTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    await use({
      ...pageObjects,
      anonymizationSettings: createLazyPageObject(AnonymizationSettingsPage, page),
    });
  },
});
