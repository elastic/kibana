/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';

const INDEX_TEMPLATE_NAME = 'index-template-test-name';

test.describe(
  'Index templates tab - template creation with index mode',
  { tag: tags.deploymentAgnostic },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsIndexManagementUser();
      await pageObjects.indexManagement.navigateToIndexManagementTab('templates');
      await pageObjects.indexManagement.indexTemplateWizard.open(INDEX_TEMPLATE_NAME, 'test-1');
    });

    test.afterEach(async ({ esClient }) => {
      await esClient.indices.deleteIndexTemplate({ name: INDEX_TEMPLATE_NAME }, { ignore: [404] });
    });

    test('can create an index template with logsdb index mode', async ({ page, pageObjects }) => {
      await page.testSubj.locator('indexModeField').click();
      await page.testSubj.locator('index_mode_logsdb').click();

      // Navigate to the last step of the wizard
      await page.testSubj.locator('formWizardStep-5').click();

      await expect(page.testSubj.locator('indexModeTitle')).toBeVisible();
      await expect(page.testSubj.locator('indexModeValue')).toHaveText('LogsDB');

      // Save it, and check the mode again in the created template's details flyout
      await pageObjects.indexManagement.clickNextButton();
      await expect(page.testSubj.locator('indexModeValue')).toHaveText('LogsDB');
      await page.testSubj.locator('closeDetailsButton').click();
    });
  }
);
