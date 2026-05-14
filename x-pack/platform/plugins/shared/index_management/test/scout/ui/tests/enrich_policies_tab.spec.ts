/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const ENRICH_INDEX_NAME = 'test-enrich-index';
const ENRICH_POLICY_NAME = 'test-enrich-policy';

test.describe('Enrich policies tab', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient, log }) => {
    await log.debug('Creating required index and enrich policy');
    try {
      await esClient.indices.delete({ index: ENRICH_INDEX_NAME }, { ignore: [404] });
    } catch (_) {
      // ignore
    }
    await esClient.indices.create({
      index: ENRICH_INDEX_NAME,
      mappings: {
        properties: {
          name: { type: 'text' },
        },
      },
    });
    await esClient.enrich.putPolicy({
      name: ENRICH_POLICY_NAME,
      match: {
        indices: ENRICH_INDEX_NAME,
        match_field: 'name',
        enrich_fields: ['name'],
      },
    });
  });

  test.afterAll(async ({ esClient, log }) => {
    await log.debug('Cleaning up created index and policy');
    try {
      await esClient.enrich.deletePolicy({ name: ENRICH_POLICY_NAME });
    } catch (e: any) {
      log.debug(`[Teardown error] Error deleting test policy: ${e.message}`);
    }
    try {
      await esClient.indices.delete({ index: ENRICH_INDEX_NAME });
    } catch (e: any) {
      log.debug(`[Teardown error] Error deleting test index: ${e.message}`);
    }
  });

  test.describe('list and details', () => {
    test.beforeEach(async ({ pageObjects, browserAuth }) => {
      await browserAuth.loginAsIndexManagementUser();
      await pageObjects.indexManagement.navigateToIndexManagementTab('enrich_policies');
    });

    test('shows enrich policies list and docs link', async ({ page }) => {
      await expect(page.testSubj.locator('enrichPoliciesList')).toBeVisible();
      await expect(page.testSubj.locator('enrichPoliciesLearnMoreLink')).toBeVisible();
    });

    test('shows the details flyout when clicking on a policy name', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.indexManagement.clickEnrichPolicyAt(0);
      expect(page.url()).toContain('/enrich_policies?policy=');
      await expect(page.testSubj.locator('policyDetailsFlyout')).toBeVisible();
      await page.testSubj.locator('closeDetailsButton').click();
    });

    test('can execute a policy', async ({ pageObjects, page }) => {
      await pageObjects.indexManagement.clickExecuteEnrichPolicyAt(0);
      await pageObjects.indexManagement.clickConfirmModalButton();
      await expect(
        page.testSubj.locator('euiToastHeader__title').filter({ hasText: `Executed ${ENRICH_POLICY_NAME}` })
      ).toBeVisible({ timeout: 15000 });
    });

    test('can delete a policy', async ({ pageObjects, page }) => {
      await pageObjects.indexManagement.navigateToIndexManagementTab('enrich_policies');

      await expect.poll(async () => page.testSubj.locator('deletePolicyButton').count()).toBeGreaterThan(0);

      await pageObjects.indexManagement.clickDeleteEnrichPolicyAt(0);
      await pageObjects.indexManagement.clickConfirmModalButton();
      await expect(
        page.testSubj.locator('euiToastHeader__title').filter({ hasText: `Deleted ${ENRICH_POLICY_NAME}` })
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('access control', () => {
    test('read-only enrich role hides create and delete buttons', async ({
      pageObjects,
      browserAuth,
      page,
    }) => {
      await browserAuth.loginAsIndexManagementMonitorEnrichOnly();
      await pageObjects.indexManagement.navigateToIndexManagementTab('enrich_policies');

      await expect(page.testSubj.locator('createPolicyButton')).toBeHidden();
      await expect(page.testSubj.locator('deletePolicyButton')).toBeHidden();
    });

    test('monitor-only role hides the enrich_policies tab', async ({
      pageObjects,
      browserAuth,
      page,
    }) => {
      await browserAuth.loginAsIndexManagementMonitorOnly();
      await pageObjects.indexManagement.goto();

      await expect(page.testSubj.locator('enrich_policiesTab')).toBeHidden();
    });
  });
});
