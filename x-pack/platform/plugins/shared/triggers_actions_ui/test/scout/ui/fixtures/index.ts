/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { RuleDetailsPage, StackAlertsPage } from './page_objects';

export interface ExtScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    ruleDetailsPage: RuleDetailsPage;
    stackAlertsPage: StackAlertsPage;
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
      stackAlertsPage: createLazyPageObject(StackAlertsPage, page),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
export {
  CONNECTORS_APP_PATH,
  CONNECTORS_LIST_SELECTORS,
  CONNECTORS_ROLE,
  MAINTENANCE_WINDOWS_APP_PATH,
  STACK_ALERTS_INDEX,
  STACK_ALERTS_INDEX_PATTERN,
  STACK_ALERTS_PAGE_PATH,
  STACK_ALERTS_PAGE_TEST_SUBJECTS,
} from './constants';
export {
  makeEsQueryRule,
  makeIndexThresholdRule,
  fillIndexThresholdForm,
  defineIndexThresholdRule,
  THRESHOLD_TEST_INDEX,
  findRuleIdByName,
  deleteRuleById,
  deleteRulesByPrefix,
} from './helpers';
export {
  setMonacoValue,
  getMonacoValue,
  navigateToConnectors,
  searchConnectors,
  openConnectorFlyout,
  searchAndOpenConnector,
  closeFlyoutIfOpen,
  cancelRuleCreation,
} from './connector_helpers';
