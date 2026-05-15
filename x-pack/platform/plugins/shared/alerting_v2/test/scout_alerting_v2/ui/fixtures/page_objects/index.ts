/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { DiscoverAppMenu } from './discover_app_menu';
import { ExecutionHistoryPage } from './execution_history_page';
import { RuleFormPage } from './rule_form_page';
import { RulesListPage } from './rules_list_page';

export { DiscoverAppMenu } from './discover_app_menu';
export { ExecutionHistoryPage } from './execution_history_page';
export { RuleFormPage } from './rule_form_page';
export { RulesListPage } from './rules_list_page';

export type AlertingPageObjects = PageObjects & {
  discoverAppMenu: DiscoverAppMenu;
  executionHistory: ExecutionHistoryPage;
  ruleForm: RuleFormPage;
  rulesList: RulesListPage;
};

export const extendPageObjects = (
  pageObjects: PageObjects,
  page: ScoutPage
): AlertingPageObjects => {
  const discoverAppMenu = createLazyPageObject(DiscoverAppMenu, page);

  return {
    ...pageObjects,
    discoverAppMenu,
    executionHistory: createLazyPageObject(ExecutionHistoryPage, page),
    ruleForm: createLazyPageObject(RuleFormPage, page, discoverAppMenu),
    rulesList: createLazyPageObject(RulesListPage, page),
  };
};
