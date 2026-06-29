/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import type { AlertingApp, AlertingNavigation } from '../fixtures/page_objects/alerting_navigation';

const ALL_APPS: readonly AlertingApp[] = ['rules', 'alerts', 'actionPolicies', 'executionHistory'];

const NO_ES_PRIVILEGES: KibanaRole['elasticsearch'] = {
  cluster: [],
  indices: [],
};

/** Full access to every alerting_v2 management feature. */
const ALL_ROLE: KibanaRole = {
  elasticsearch: NO_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_rules: ['all'],
        alerting_v2_alerts: ['all'],
        alerting_v2_action_policies: ['all'],
        alerting_v2_execution_history: ['all'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

/** Read-only access to every alerting_v2 management feature. */
const READ_ROLE: KibanaRole = {
  elasticsearch: NO_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_rules: ['read'],
        alerting_v2_alerts: ['read'],
        alerting_v2_action_policies: ['read'],
        alerting_v2_execution_history: ['read'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

/** No alerting_v2 access at all; every management page must be gated. */
const NO_ACCESS_ROLE: KibanaRole = {
  elasticsearch: NO_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

/** Read-only access scoped to a single alerting_v2 feature. */
const RULES_READ_ROLE: KibanaRole = {
  elasticsearch: NO_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_rules: ['read'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

const ALERTS_READ_ROLE: KibanaRole = {
  elasticsearch: NO_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_alerts: ['read'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

const ACTION_POLICIES_READ_ROLE: KibanaRole = {
  elasticsearch: NO_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_action_policies: ['read'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

const EXECUTION_HISTORY_READ_ROLE: KibanaRole = {
  elasticsearch: NO_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_execution_history: ['read'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

/**
 * Visits every management page and asserts that the `allowed` pages render their
 * heading while the rest show the "Privileges required" interstitial. Looping
 * over the apps inside the test keeps the assertion logic in one place without
 * hiding the role-level cases behind a data-driven `test()` title.
 */
async function expectAccess(
  pageObjects: { alertingNavigation: AlertingNavigation },
  allowed: readonly AlertingApp[]
) {
  for (const app of ALL_APPS) {
    const isAllowed = allowed.includes(app);
    await test.step(
      isAllowed ? `${app} is accessible` : `${app} shows the privileges interstitial`,
      async () => {
        await pageObjects.alertingNavigation.goto(app);
        if (isAllowed) {
          await expect(pageObjects.alertingNavigation.pageHeading(app)).toBeVisible();
          await expect(pageObjects.alertingNavigation.requiredPrivilegesPrompt).toBeHidden();
        } else {
          await expect(pageObjects.alertingNavigation.requiredPrivilegesPrompt).toBeVisible();
          await expect(pageObjects.alertingNavigation.requiredPrivilegeItem(app)).toBeVisible();
          await expect(pageObjects.alertingNavigation.pageHeading(app)).toBeHidden();
        }
      }
    );
  }
}

test.describe('Management pages - required privileges', { tag: tags.deploymentAgnostic }, () => {
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
    await browserAuth.loginWithCustomRole(RULES_READ_ROLE);
    await expectAccess(pageObjects, ['rules']);
  });

  test('user with alerts read-only role can only view the Alerts page', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(ALERTS_READ_ROLE);
    await expectAccess(pageObjects, ['alerts']);
  });

  test('user with action policies read-only role can only view the Action Policies page', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(ACTION_POLICIES_READ_ROLE);
    await expectAccess(pageObjects, ['actionPolicies']);
  });

  test('user with execution history read-only role can only view the Execution History page', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(EXECUTION_HISTORY_READ_ROLE);
    await expectAccess(pageObjects, ['executionHistory']);
  });
});
