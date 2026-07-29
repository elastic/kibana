/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import type { AlertingApp } from '../fixtures/page_objects/alerting_navigation';
import type { AlertingPageObjects } from '../fixtures/page_objects';
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

const complement = (all: readonly AlertingApp[], subset: readonly AlertingApp[]): AlertingApp[] =>
  all.filter((app) => !subset.includes(app));

interface AccessTestArgs {
  browserAuth: { loginWithCustomRole: (role: KibanaRole) => Promise<void> };
  pageObjects: AlertingPageObjects;
}

const accessTestBody =
  (role: KibanaRole, allowedApps: readonly AlertingApp[]) =>
  async ({ browserAuth, pageObjects }: AccessTestArgs) => {
    await browserAuth.loginWithCustomRole(role);
    const { alertingNavigation: nav } = pageObjects;

    for (const app of allowedApps) {
      await test.step(`${app} is accessible`, async () => {
        await nav.goto(app);
        await expect(nav.pageHeading(app)).toBeVisible();
        await expect(nav.managementLanding).toBeHidden();
      });
    }

    for (const app of complement(ALL_APPS, allowedApps)) {
      await test.step(`${app} falls through to the management landing page`, async () => {
        await nav.goto(app);
        await expect(nav.managementLanding).toBeVisible();
        await expect(nav.pageHeading(app)).toBeHidden();
      });
    }
  };

test.describe('Management pages - required privileges', { tag: tags.deploymentAgnostic }, () => {
  test('user with full access can view every management page', accessTestBody(ALL_ROLE, ALL_APPS));

  test(
    'user with read-only access can view every management page',
    accessTestBody(READ_ROLE, ALL_APPS)
  );

  test(
    'user without alerting_v2 access is redirected to the management landing on every page',
    accessTestBody(NO_ACCESS_ROLE, [])
  );

  test(
    'user with rules read-only role can only view the Rules page',
    accessTestBody(ALERTING_V2_RULES_READ_ROLE, ['rules'])
  );

  test(
    'user with alerts read-only role can only view the Alerts page',
    accessTestBody(ALERTING_V2_ALERTS_READ_ROLE, ['alerts'])
  );

  test(
    'user with action policies read-only role can only view the Action Policies page',
    accessTestBody(ALERTING_V2_ACTION_POLICIES_READ_ROLE, ['actionPolicies'])
  );

  test(
    'user with execution history read-only role can only view the Execution History page',
    accessTestBody(ALERTING_V2_EXECUTION_HISTORY_READ_ROLE, ['executionHistory'])
  );
});
