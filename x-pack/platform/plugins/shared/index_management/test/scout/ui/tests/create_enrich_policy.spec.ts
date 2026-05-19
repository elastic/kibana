/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const INDEX_NAME = `test-enrich-create-index-${Math.random().toString(36).slice(2)}`;
const POLICY_NAME = `test-enrich-create-policy-${Math.random().toString(36).slice(2)}`;

test.describe('Create enrich policy', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient, log }) => {
    await log.debug('Creating test index');
    await esClient.indices.create({
      index: INDEX_NAME,
      mappings: {
        properties: {
          email: { type: 'text' },
          age: { type: 'long' },
        },
      },
    });
  });

  test.beforeEach(async ({ pageObjects, browserAuth, page }) => {
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('enrich_policies');
    await page.testSubj.locator('enrichPoliciesEmptyPromptCreateButton').click();
  });

  test.afterAll(async ({ esClient, log }) => {
    await log.debug('Cleaning up created index and policy');
    try {
      await esClient.enrich.deletePolicy({ name: POLICY_NAME });
    } catch (e: any) {
      log.debug(`[Teardown error] Error deleting test policy: ${e.message}`);
    }
    try {
      await esClient.indices.delete({ index: INDEX_NAME });
    } catch (e: any) {
      log.debug(`[Teardown error] Error deleting test index: ${e.message}`);
    }
  });

  test('shows create enrich policy page and docs link', async ({ page }) => {
    await expect(page.testSubj.locator('createEnrichPolicyHeaderContent')).toBeVisible();
    await expect(page.testSubj.locator('createEnrichPolicyDocumentationLink')).toBeVisible();
  });

  test('can create an enrich policy', async ({ page }) => {
    // Complete configuration step
    await page.testSubj.locator('policyNameField').locator('input').fill(POLICY_NAME);
    await page.testSubj.locator('policyTypeField').fill('match');

    const sourceIndicesComboBox = page.testSubj.locator('policySourceIndicesField');
    await sourceIndicesComboBox.locator('input').fill(INDEX_NAME);
    await page.locator(`[role="option"]`).filter({ hasText: INDEX_NAME }).click();

    await page.testSubj.locator('nextButton').click();

    // Complete field selection step
    const matchFieldComboBox = page.testSubj.locator('matchField');
    await matchFieldComboBox.locator('input').fill('email');
    await page.locator(`[role="option"]`).filter({ hasText: 'email' }).click();

    const enrichFieldsComboBox = page.testSubj.locator('enrichFields');
    await enrichFieldsComboBox.locator('input').fill('age');
    await page.locator(`[role="option"]`).filter({ hasText: 'age' }).click();

    await page.testSubj.locator('nextButton').click();

    // Create policy
    await page.testSubj.locator('createButton').click();

    // Verify policy appears in the list
    const policyLinks = page.testSubj.locator('enrichPolicyDetailsLink');
    await expect.poll(async () => policyLinks.count()).toBeGreaterThanOrEqual(1);
  });
});
