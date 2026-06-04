/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test, CUSTOM_ROLES } from '../fixtures';

const SEED_POLICY_NAME = 'scout-ilm-readonly-seed-policy';

test.describe('Index Lifecycle Policies — read-only view', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.ilm.deleteLifecycle({ name: SEED_POLICY_NAME }).catch(() => {});
    await esClient.ilm.putLifecycle({
      name: SEED_POLICY_NAME,
      policy: { phases: { hot: { actions: {} } } },
    });
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.ilm.deleteLifecycle({ name: SEED_POLICY_NAME }).catch(() => {});
  });

  test('read_ilm user sees the policy list but cannot create policies and can open the flyout', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.read_ilm);

    await test.step('navigate to ILM', async () => {
      await pageObjects.ilm.goto();
    });

    await test.step('page header reads "Index Lifecycle Policies"', async () => {
      await expect(pageObjects.ilm.pageHeader).toHaveText('Index Lifecycle Policies');
    });

    await test.step('Create policy button is not present', async () => {
      await expect(pageObjects.ilm.createPolicyButton).toBeHidden();
    });

    await test.step('clicking a policy name opens the detail flyout', async () => {
      await pageObjects.ilm.clickPolicyLink(SEED_POLICY_NAME);
      await expect(pageObjects.ilm.policyFlyoutTitle).toBeVisible({ timeout: 10000 });
    });
  });
});
