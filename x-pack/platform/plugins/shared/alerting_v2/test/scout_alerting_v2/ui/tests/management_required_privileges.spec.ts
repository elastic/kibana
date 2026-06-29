/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import type {
  AlertingAccessPage,
  AlertingApp,
} from '../fixtures/page_objects/alerting_access_page';
import {
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  ALERTING_V2_ALERTS_READ_ROLE,
  ALERTING_V2_EXECUTION_HISTORY_READ_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  ALL_ROLE,
  NO_ACCESS_ROLE,
  READ_ROLE,
} from '../../common/roles';

const ALL_APPS: readonly AlertingApp[] = ['rules', 'alerts', 'actionPolicies', 'executionHistory'];

/**
 * Visits every management page and asserts that the `allowed` pages render their
 * heading while the rest show the "Privileges required" interstitial. Looping
 * over the apps inside the test keeps the assertion logic in one place without
 * hiding the role-level cases behind a data-driven `test()` title.
 */
async function expectAccess(
  pageObjects: { alertingAccess: AlertingAccessPage },
  allowed: readonly AlertingApp[]
) {
  for (const app of ALL_APPS) {
    const isAllowed = allowed.includes(app);
    await test.step(
      isAllowed ? `${app} is accessible` : `${app} shows the privileges interstitial`,
      async () => {
        await pageObjects.alertingAccess.goto(app);
        if (isAllowed) {
          await expect(pageObjects.alertingAccess.pageHeading(app)).toBeVisible();
          await expect(pageObjects.alertingAccess.requiredPrivilegesPrompt).toBeHidden();
        } else {
          await expect(pageObjects.alertingAccess.requiredPrivilegesPrompt).toBeVisible();
          await expect(pageObjects.alertingAccess.requiredPrivilegeItem(app)).toBeVisible();
          await expect(pageObjects.alertingAccess.pageHeading(app)).toBeHidden();
        }
      }
    );
  }
}

/*
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
test.describe('Management pages - required privileges', { tag: '@local-stateful-classic' }, () => {
  test('user with full access can view every management page', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(ALL_ROLE);
    await expectAccess(pageObjects, ALL_APPS);
  });

  test('user with read-only access can view every management page', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(READ_ROLE);
    await expectAccess(pageObjects, ALL_APPS);
  });

  test('user without alerting_v2 access sees the interstitial on every page', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(NO_ACCESS_ROLE);
    await expectAccess(pageObjects, []);
  });

  test('user with rules read-only role can only view the Rules page', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(ALERTING_V2_RULES_READ_ROLE);
    await expectAccess(pageObjects, ['rules']);
  });

  test('user with alerts read-only role can only view the Alerts page', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(ALERTING_V2_ALERTS_READ_ROLE);
    await expectAccess(pageObjects, ['alerts']);
  });

  test('user with action policies read-only role can only view the Action Policies page', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(ALERTING_V2_ACTION_POLICIES_READ_ROLE);
    await expectAccess(pageObjects, ['actionPolicies']);
  });

  test('user with execution history read-only role can only view the Execution History page', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(ALERTING_V2_EXECUTION_HISTORY_READ_ROLE);
    await expectAccess(pageObjects, ['executionHistory']);
  });
});
