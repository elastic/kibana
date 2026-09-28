/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';
import {
  cleanupEnrichPolicy,
  createEnrichPolicy,
  ENRICH_POLICY_NAME,
} from '../../lib/enrich_policies';

test.describe('Enrich policies tab', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, esClient, pageObjects }) => {
    await cleanupEnrichPolicy(esClient);
    await createEnrichPolicy(esClient);
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('enrich_policies');
  });

  test.afterEach(async ({ esClient }) => {
    await cleanupEnrichPolicy(esClient);
  });

  test('shows enrich policies page and docs link', async ({ page }) => {
    await expect(page.testSubj.locator('enrichPoliciesList')).toBeVisible();
    await expect(page.testSubj.locator('enrichPoliciesLearnMoreLink')).toBeVisible();
  });

  test('shows the details flyout when clicking on a policy name', async ({ page, pageObjects }) => {
    await pageObjects.indexManagement.clickEnrichPolicy(ENRICH_POLICY_NAME);

    await expect(page).toHaveURL(/\/enrich_policies\?policy=/);
    await expect(page.testSubj.locator('policyDetailsFlyout')).toBeVisible();
    await page.testSubj.locator('euiFlyoutCloseButton').click();
  });

  test('can execute a policy', async ({ page, pageObjects }) => {
    await pageObjects.indexManagement.executeEnrichPolicy(ENRICH_POLICY_NAME);

    await expect(page.testSubj.locator('globalToastList')).toContainText(
      `Executed ${ENRICH_POLICY_NAME}`
    );
  });

  test('can delete a policy', async ({ page, pageObjects }) => {
    await pageObjects.indexManagement.deleteEnrichPolicy(ENRICH_POLICY_NAME);

    await expect(page.testSubj.locator('globalToastList')).toContainText(
      `Deleted ${ENRICH_POLICY_NAME}`
    );
  });
});
