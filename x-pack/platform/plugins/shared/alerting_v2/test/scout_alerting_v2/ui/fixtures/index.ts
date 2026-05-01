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
import { RulesListPage } from './page_objects/rules_list_page';

export interface AlertingV2UiFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    discoverAppMenu: DiscoverAppMenu;
    ruleForm: RuleFormPage;
    rulesList: RulesListPage;
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
    const discoverAppMenu = createLazyPageObject(DiscoverAppMenu, page);
    const extendedPageObjects = {
      ...pageObjects,
      discoverAppMenu,
      ruleForm: createLazyPageObject(RuleFormPage, page, discoverAppMenu),
      rulesList: createLazyPageObject(RulesListPage, page),
    };

    await use(extendedPageObjects);
  },
});
