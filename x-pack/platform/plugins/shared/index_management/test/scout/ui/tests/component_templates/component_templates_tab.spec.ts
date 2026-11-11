/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';

const TEST_COMPONENT_TEMPLATE = '.a_test_component_template';

test.describe('Component templates tab', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, esClient, pageObjects }) => {
    await esClient.cluster.deleteComponentTemplate(
      { name: TEST_COMPONENT_TEMPLATE },
      { ignore: [404] }
    );
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('component_templates');
  });

  test.afterEach(async ({ esClient }) => {
    await esClient.cluster.deleteComponentTemplate(
      { name: TEST_COMPONENT_TEMPLATE },
      { ignore: [404] }
    );
  });

  test('renders the component templates tab', async ({ page }) => {
    await expect(page).toHaveURL(/\/component_templates/);
    await expect(page.testSubj.locator('componentTemplatesTable')).toBeVisible();
  });

  test('displays a component template in the list', async ({ esClient, page }) => {
    await esClient.cluster.putComponentTemplate({
      name: TEST_COMPONENT_TEMPLATE,
      template: { settings: { index: { number_of_shards: 1 } } },
    });
    await page.testSubj.locator('reloadButton').click();

    // The name renders as an EuiLink with an explicit `role="button"`.
    await expect(
      page.testSubj
        .locator('templateDetailsLink')
        .and(page.getByRole('button', { name: TEST_COMPONENT_TEMPLATE, exact: true }))
    ).toBeVisible();
  });

  test('creates a component template', async ({ page, pageObjects }) => {
    await page.testSubj.locator('createComponentTemplateButton').click();
    // `nameField` carries the test subject on its EuiFormRow wrapper.
    await page.testSubj.locator('nameField').locator('input').fill(TEST_COMPONENT_TEMPLATE);

    // Walk the remaining optional steps (index settings, mappings, aliases, review) and submit.
    for (let step = 0; step < 5; step++) {
      await pageObjects.indexManagement.clickNextButton();
    }

    await expect(page.testSubj.locator('title')).toContainText(TEST_COMPONENT_TEMPLATE);
  });
});
