/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as baseTest } from '@kbn/scout';
import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { RuleFormPage } from './page_objects/rule_form_page';

interface AlertingV2Fixtures extends ScoutTestFixtures {
  pageObjects: ScoutTestFixtures['pageObjects'] & { ruleForm: RuleFormPage };
}

export const test = baseTest.extend<AlertingV2Fixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: AlertingV2Fixtures['pageObjects'];
      page: ScoutPage;
    },
    use: (pageObjects: AlertingV2Fixtures['pageObjects']) => Promise<void>
  ) => {
    const ruleForm = createLazyPageObject(RuleFormPage, page);
    await use({ ...pageObjects, ruleForm });
  },
});
