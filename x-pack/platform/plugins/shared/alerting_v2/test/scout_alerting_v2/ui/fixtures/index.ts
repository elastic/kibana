/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { DiscoverAppMenu } from './page_objects/discover_app_menu';
import { RuleFormPage } from './page_objects/rule_form_page';

export interface AlertingV2UiFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    discoverAppMenu: DiscoverAppMenu;
    ruleForm: RuleFormPage;
  };
}

export const test = baseTest.extend<AlertingV2UiFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: AlertingV2UiFixtures['pageObjects'];
      page: AlertingV2UiFixtures['page'];
    },
    use: (pageObjects: AlertingV2UiFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      discoverAppMenu: createLazyPageObject(DiscoverAppMenu, page),
      ruleForm: createLazyPageObject(RuleFormPage, page),
    };

    await use(extendedPageObjects);
  },
});
