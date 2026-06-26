/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Cold and frozen phases are omitted: enabling cold phase defaults to a searchable snapshot
// action that requires a registered snapshot repository, which is not available in the Scout
// cluster. Warm and delete phases are sufficient to cover multi-phase policy creation.

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test, CUSTOM_ROLES } from '../fixtures';

const POLICY_NAME = 'scout-ilm-home-test-policy';

test.describe('Index Lifecycle Policies', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.ilm.deleteLifecycle({ name: POLICY_NAME }).catch(() => {});
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.ilm.deleteLifecycle({ name: POLICY_NAME }).catch(() => {});
  });

  test('shows the header and Create policy button for a user with manage_ilm', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.manage_ilm);

    await test.step('navigate to ILM', async () => {
      await pageObjects.ilm.goto();
    });

    await test.step('page header reads "Index Lifecycle Policies"', async () => {
      await expect(pageObjects.ilm.pageHeader).toHaveText('Index Lifecycle Policies');
    });

    await test.step('Create policy button is visible', async () => {
      await expect(pageObjects.ilm.createPolicyButton).toBeVisible();
    });
  });

  test('creates a multi-phase policy and shows it in the list', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.manage_ilm);

    await test.step('navigate to ILM', async () => {
      await pageObjects.ilm.goto();
    });

    await test.step('fill and save new policy form with warm and delete phases', async () => {
      await pageObjects.ilm.createPolicy({
        policyName: POLICY_NAME,
        warmEnabled: true,
        deleteEnabled: true,
      });
    });

    await test.step('flyout opens showing the new policy name', async () => {
      await expect(pageObjects.ilm.policyFlyoutTitle).toHaveText(POLICY_NAME, { timeout: 15000 });
      await pageObjects.ilm.policyFlyoutCloseButton.click();
    });

    await test.step('policy appears in the list after the flyout is closed', async () => {
      await expect(pageObjects.ilm.pageHeader).toHaveText('Index Lifecycle Policies');
      await pageObjects.ilm.increasePolicyListPageSize();
      await expect(pageObjects.ilm.getPolicyRow(POLICY_NAME)).toBeVisible();
    });

    await test.step('navigating away from a dirty form shows a confirmation dialog', async () => {
      await pageObjects.ilm.createPolicyButton.click();
      await pageObjects.ilm.policyNameField.fill(POLICY_NAME);
      await pageObjects.ilm.kibanaLogo.click();
      await expect(pageObjects.ilm.navigationBlockConfirmModal).toBeVisible();
    });
  });
});
