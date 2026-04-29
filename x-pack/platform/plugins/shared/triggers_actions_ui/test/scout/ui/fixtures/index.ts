/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import {
  RuleCreatePage,
  RuleDetailsPage,
  RuleEditPage,
  RulesListPage,
  RulesSettingsPage,
} from './page_objects';

export interface ExtScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    ruleDetailsPage: RuleDetailsPage;
    rulesListPage: RulesListPage;
    rulesSettingsPage: RulesSettingsPage;
    ruleCreatePage: RuleCreatePage;
    ruleEditPage: RuleEditPage;
  };
}

export const test = baseTest.extend<ExtScoutTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtScoutTestFixtures['pageObjects'];
      page: ExtScoutTestFixtures['page'];
    },
    use: (pageObjects: ExtScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      ruleDetailsPage: createLazyPageObject(RuleDetailsPage, page),
      rulesListPage: createLazyPageObject(RulesListPage, page),
      rulesSettingsPage: createLazyPageObject(RulesSettingsPage, page),
      ruleCreatePage: createLazyPageObject(RuleCreatePage, page),
      ruleEditPage: createLazyPageObject(RuleEditPage, page),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
