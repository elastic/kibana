/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';

const INDEX_NAME = 'create-enrich-source-index';
const POLICY_NAME = 'create-enrich-test-policy';

const cleanup = async (esClient: EsClient) => {
  await esClient.enrich.deletePolicy({ name: POLICY_NAME }, { ignore: [404] });
  await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
};

test.describe('Create enrich policy', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, esClient, page, pageObjects }) => {
    await cleanup(esClient);
    await esClient.indices.create({
      index: INDEX_NAME,
      mappings: { properties: { email: { type: 'text' }, age: { type: 'long' } } },
    });

    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('enrich_policies');
    // With no policies yet, the tab shows an empty prompt whose button opens the create wizard.
    await page.testSubj.locator('enrichPoliciesEmptyPromptCreateButton').click();
  });

  test.afterEach(async ({ esClient }) => {
    await cleanup(esClient);
  });

  test('shows create enrich policies page and docs link', async ({ page }) => {
    await expect(page.testSubj.locator('appHeaderTitle')).toHaveText('Create enrich policy');
    // At Scout's viewport the Documentation link is collapsed into the app-menu overflow popover.
    await page.testSubj.locator('app-menu-overflow-button').click();
    await expect(page.testSubj.locator('appHeaderMenuDocumentation')).toBeVisible();
  });

  test('can create an enrich policy', async ({ page }) => {
    // Configuration step
    await page.testSubj.locator('policyNameField').locator('input').fill(POLICY_NAME);
    await page.testSubj.locator('policyTypeField').selectOption('match');
    await page.components.comboBox('policySourceIndicesField').setSelectedOptions([INDEX_NAME]);
    await page.testSubj.locator('nextButton').click();

    // Field selection step
    await page.components.comboBox('matchField').setSelectedOptions(['email']);
    await page.components.comboBox('enrichFields').setSelectedOptions(['age']);
    await page.testSubj.locator('nextButton').click();

    // Create step
    await page.testSubj.locator('createButton').click();

    // Redirects to the enrich policies tab with the new policy listed.
    await expect(page.testSubj.locator('enrichPolicyDetailsLink')).toHaveCount(1);
  });
});
