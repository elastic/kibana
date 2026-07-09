/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test, CUSTOM_ROLES } from '../fixtures';

const MANAGED_POLICY_NAME = 'scout-ilm-managed-policy-dup-test';
const CLONED_POLICY_NAME = 'scout-ilm-managed-policy-dup-test-clone';

test.describe(
  'Index Lifecycle Policies — duplicate managed policy',
  { tag: tags.stateful.classic },
  () => {
    test.beforeAll(async ({ esClient }) => {
      await esClient.ilm.deleteLifecycle({ name: CLONED_POLICY_NAME }).catch(() => {});
      await esClient.ilm.deleteLifecycle({ name: MANAGED_POLICY_NAME }).catch(() => {});

      await esClient.ilm.putLifecycle({
        name: MANAGED_POLICY_NAME,
        policy: {
          _meta: { managed: true },
          phases: { hot: { actions: {} } },
        },
      });
    });

    test.afterAll(async ({ esClient }) => {
      await esClient.ilm.deleteLifecycle({ name: CLONED_POLICY_NAME }).catch(() => {});
      await esClient.ilm.deleteLifecycle({ name: MANAGED_POLICY_NAME }).catch(() => {});
    });

    test('cloning a managed policy does not propagate the managed flag', async ({
      browserAuth,
      esClient,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(CUSTOM_ROLES.manage_ilm);

      await test.step('open the managed policy in the editor', async () => {
        await pageObjects.ilm.gotoEditPolicy(MANAGED_POLICY_NAME);
        await expect(pageObjects.ilm.editManagedPolicyCallOut).toBeVisible({
          timeout: 15000,
        });
      });

      await test.step('clone via "Save as new policy" and save', async () => {
        await pageObjects.ilm.cloneCurrentPolicy(CLONED_POLICY_NAME);
      });

      await test.step('flyout opens for the cloned policy', async () => {
        await expect(pageObjects.ilm.policyFlyoutTitle).toHaveText(CLONED_POLICY_NAME, {
          timeout: 15000,
        });
      });

      await test.step('cloned policy does not show the managed callout in the editor', async () => {
        await pageObjects.ilm.gotoEditPolicy(CLONED_POLICY_NAME);
        await expect(pageObjects.ilm.editWarning).toBeVisible({ timeout: 15000 });
        await expect(pageObjects.ilm.editManagedPolicyCallOut).toBeHidden();
      });

      await test.step('cloned policy _meta.managed is not set in Elasticsearch', async () => {
        const response = await esClient.ilm.getLifecycle({ name: CLONED_POLICY_NAME });
        const cloned = (response as Record<string, any>)[CLONED_POLICY_NAME]?.policy;
        expect(cloned?._meta?.managed).toBeUndefined();
      });
    });
  }
);
