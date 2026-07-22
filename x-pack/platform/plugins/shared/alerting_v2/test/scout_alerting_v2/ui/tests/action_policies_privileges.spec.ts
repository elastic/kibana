/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  ALERTING_V2_ACTION_POLICIES_ALL_ROLE,
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  buildCreateActionPolicyData,
  test,
} from '../fixtures';

/*
 * Covers the UI capability gating on the Action Policies page (PR #277390).
 * Read-only users can view action policies and open the details flyout, but
 * every write affordance (create, row edit/actions, snooze toggle, details
 * flyout edit + actions menu) is hidden and the `/edit/:id` route is gated by
 * the required-privileges interstitial.
 *
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
test.describe('Action Policies - read/write privileges', { tag: '@local-stateful-classic' }, () => {
  let policyId: string;

  test.beforeAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
    const policy = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'scout-action-policy-privileges' })
    );
    policyId = policy.id;
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  test('editor sees every write affordance', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(ALERTING_V2_ACTION_POLICIES_ALL_ROLE);
    const { actionPoliciesList } = pageObjects;
    await actionPoliciesList.goto();
    await expect(actionPoliciesList.detailsLink(policyId)).toBeVisible();

    await test.step('create button and row view-details are visible', async () => {
      await expect(actionPoliciesList.createButton).toBeVisible();
      await expect(actionPoliciesList.viewDetailsButton).toBeVisible();
    });

    await test.step('details flyout exposes edit and the actions menu', async () => {
      await actionPoliciesList.openDetailsFlyout();
      await expect(actionPoliciesList.detailsFlyout).toBeVisible();
      await expect(actionPoliciesList.detailsFlyoutEditButton).toBeVisible();
      await expect(actionPoliciesList.detailsFlyoutActionsMenuButton).toBeVisible();
    });
  });

  test('read-only user cannot access write affordances', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(ALERTING_V2_ACTION_POLICIES_READ_ROLE);
    const { actionPoliciesList } = pageObjects;
    await actionPoliciesList.goto();
    await expect(actionPoliciesList.detailsLink(policyId)).toBeVisible();

    await test.step('create button is hidden but view-details remains', async () => {
      await expect(actionPoliciesList.createButton).toHaveCount(0);
      await expect(actionPoliciesList.viewDetailsButton).toBeVisible();
    });

    await test.step('details flyout opens but hides edit and the actions menu', async () => {
      await actionPoliciesList.openDetailsFlyout();
      // Positive, privilege-independent anchor: confirm the flyout actually
      // rendered before asserting the write affordances are absent, otherwise
      // the toHaveCount(0) checks would pass even if the flyout never opened.
      await expect(actionPoliciesList.detailsFlyout).toBeVisible();
      await expect(actionPoliciesList.detailsFlyoutEditButton).toHaveCount(0);
      await expect(actionPoliciesList.detailsFlyoutActionsMenuButton).toHaveCount(0);
    });
  });

  test('read-only user is blocked from the edit route', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(ALERTING_V2_ACTION_POLICIES_READ_ROLE);
    await pageObjects.actionPoliciesList.gotoEdit(policyId);

    await expect(pageObjects.alertingNavigation.requiredPrivilegesPrompt).toBeVisible();
  });
});
