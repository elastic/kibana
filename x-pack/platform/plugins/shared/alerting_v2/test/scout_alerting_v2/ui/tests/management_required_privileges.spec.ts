/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import type { AlertingV2App } from '../fixtures/page_objects/alerting_v2_access_page';
import {
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  ALERTING_V2_ALERTS_READ_ROLE,
  ALERTING_V2_EXECUTION_HISTORY_READ_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  ALL_ROLE,
  NO_ACCESS_ROLE,
  READ_ROLE,
} from '../../common/roles';

const ALL_APPS: AlertingV2App[] = ['rules', 'alerts', 'actionPolicies', 'executionHistory'];

interface RoleScenario {
  readonly name: string;
  readonly role: KibanaRole;
  /** Apps the role is expected to be able to view; the rest show the interstitial. */
  readonly allowed: readonly AlertingV2App[];
}

const SCENARIOS: RoleScenario[] = [
  { name: 'full access across all features', role: ALL_ROLE, allowed: ALL_APPS },
  { name: 'read-only across all features', role: READ_ROLE, allowed: ALL_APPS },
  { name: 'no alerting_v2 access', role: NO_ACCESS_ROLE, allowed: [] },
  { name: 'rules read only', role: ALERTING_V2_RULES_READ_ROLE, allowed: ['rules'] },
  { name: 'alerts read only', role: ALERTING_V2_ALERTS_READ_ROLE, allowed: ['alerts'] },
  {
    name: 'action policies read only',
    role: ALERTING_V2_ACTION_POLICIES_READ_ROLE,
    allowed: ['actionPolicies'],
  },
  {
    name: 'execution history read only',
    role: ALERTING_V2_EXECUTION_HISTORY_READ_ROLE,
    allowed: ['executionHistory'],
  },
];

/*
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
test.describe('Management pages — required privileges', { tag: '@local-stateful-classic' }, () => {
  for (const { name, role, allowed } of SCENARIOS) {
    const denied = ALL_APPS.filter((app) => !allowed.includes(app));

    test(`${name}`, async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(role);

      for (const app of allowed) {
        await test.step(`${app} is accessible`, async () => {
          await pageObjects.alertingV2Access.goto(app);
          await expect(pageObjects.alertingV2Access.pageHeading(app)).toBeVisible();
          await expect(pageObjects.alertingV2Access.requiredPrivilegesPrompt).toBeHidden();
        });
      }

      for (const app of denied) {
        await test.step(`${app} shows the privileges interstitial`, async () => {
          await pageObjects.alertingV2Access.goto(app);
          await expect(pageObjects.alertingV2Access.requiredPrivilegesPrompt).toBeVisible();
          await expect(pageObjects.alertingV2Access.requiredPrivilegeItem(app)).toBeVisible();
          await expect(pageObjects.alertingV2Access.pageHeading(app)).toBeHidden();
        });
      }
    });
  }
});
