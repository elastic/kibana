/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultRolesFixture, mergeTests, requestAuthFixture, test as baseTest } from '@kbn/scout';
import type { BrowserAuthFixture, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { extendPageObjects, type AlertingPageObjects } from './page_objects';
import {
  buildAlertingApiServices,
  type AlertingApiServicesFixture,
} from '../../alerting_api_services';
import {
  ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE,
  ALERTING_V2_ACTION_POLICIES_ALL_ROLE,
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  ALERTING_V2_ALERTS_ALL_ROLE,
  ALERTING_V2_ALERTS_AND_RULES_READ_ROLE,
  ALERTING_V2_ALERTS_READ_ROLE,
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  ALL_ROLE,
  NO_ACCESS_ROLE,
  READ_ROLE,
} from '../../roles';
import {
  ACTION_POLICY_FORM_ROLE,
  EPISODE_DETAILS_READ_ROLE,
  EXECUTION_HISTORY_PAGE_READ_ROLE,
  RULES_READ_AND_V1_READ_ROLE,
  RULE_FORM_ROLE,
} from '../roles';

/**
 * Logins scoped to what a surface actually needs, so a test only fails on a privilege it is
 * meant to exercise. `loginAsAlertingEditor`/`loginAsAlertingViewer` grant every alerting
 * feature and are the fallback when a test spans more than one of them.
 */
export interface AlertingBrowserAuthFixture extends BrowserAuthFixture {
  loginAsAlertingEditor: () => Promise<void>;
  loginAsAlertingViewer: () => Promise<void>;
  loginAsUserWithoutAlertingAccess: () => Promise<void>;
  loginAsRuleEditor: () => Promise<void>;
  loginAsRuleViewer: () => Promise<void>;
  /** Rule create/edit from Discover: rule write plus the reads the form's steps issue. */
  loginAsRuleFormEditor: () => Promise<void>;
  loginAsAlertEditor: () => Promise<void>;
  loginAsAlertViewer: () => Promise<void>;
  /** Alert read plus the rule read the episodes list needs to resolve an episode's rule. */
  loginAsAlertAndRuleViewer: () => Promise<void>;
  /** Alerting rule read plus a classic (v1) rules capability, so both list tabs render. */
  loginAsRuleAndClassicRuleViewer: () => Promise<void>;
  /** Alert episode details, including the execution-history tab it mounts. */
  loginAsEpisodeDetailsViewer: () => Promise<void>;
  loginAsActionPolicyEditor: () => Promise<void>;
  loginAsActionPolicyViewer: () => Promise<void>;
  /** Action policy create/edit form, which also reads rules, alerts and workflows. */
  loginAsActionPolicyFormEditor: () => Promise<void>;
  /** Action policy write plus the rule read the affected-rules flyout needs. */
  loginAsActionPolicyRuleReviewer: () => Promise<void>;
  /** Execution history page, whose rows resolve the policies and workflows they dispatched to. */
  loginAsExecutionHistoryViewer: () => Promise<void>;
}

export interface AlertingTestFixtures extends ScoutTestFixtures {
  browserAuth: AlertingBrowserAuthFixture;
  pageObjects: AlertingPageObjects;
}

export interface UiWorkerFixtures extends ScoutWorkerFixtures {
  apiServices: AlertingApiServicesFixture;
}

export const test = mergeTests(baseTest, defaultRolesFixture, requestAuthFixture).extend<
  {
    browserAuth: AlertingBrowserAuthFixture;
    pageObjects: AlertingPageObjects;
  },
  { apiServices: AlertingApiServicesFixture }
>({
  browserAuth: async (
    { browserAuth }: { browserAuth: BrowserAuthFixture },
    use: (extendedBrowserAuth: AlertingBrowserAuthFixture) => Promise<void>
  ) => {
    await use({
      ...browserAuth,
      loginAsAlertingEditor: () => browserAuth.loginWithCustomRole(ALL_ROLE),
      loginAsAlertingViewer: () => browserAuth.loginWithCustomRole(READ_ROLE),
      loginAsUserWithoutAlertingAccess: () => browserAuth.loginWithCustomRole(NO_ACCESS_ROLE),
      loginAsRuleEditor: () => browserAuth.loginWithCustomRole(ALERTING_V2_RULES_ALL_ROLE),
      loginAsRuleViewer: () => browserAuth.loginWithCustomRole(ALERTING_V2_RULES_READ_ROLE),
      loginAsRuleFormEditor: () => browserAuth.loginWithCustomRole(RULE_FORM_ROLE),
      loginAsAlertEditor: () => browserAuth.loginWithCustomRole(ALERTING_V2_ALERTS_ALL_ROLE),
      loginAsAlertViewer: () => browserAuth.loginWithCustomRole(ALERTING_V2_ALERTS_READ_ROLE),
      loginAsAlertAndRuleViewer: () =>
        browserAuth.loginWithCustomRole(ALERTING_V2_ALERTS_AND_RULES_READ_ROLE),
      loginAsRuleAndClassicRuleViewer: () =>
        browserAuth.loginWithCustomRole(RULES_READ_AND_V1_READ_ROLE),
      loginAsEpisodeDetailsViewer: () => browserAuth.loginWithCustomRole(EPISODE_DETAILS_READ_ROLE),
      loginAsActionPolicyEditor: () =>
        browserAuth.loginWithCustomRole(ALERTING_V2_ACTION_POLICIES_ALL_ROLE),
      loginAsActionPolicyViewer: () =>
        browserAuth.loginWithCustomRole(ALERTING_V2_ACTION_POLICIES_READ_ROLE),
      loginAsActionPolicyFormEditor: () => browserAuth.loginWithCustomRole(ACTION_POLICY_FORM_ROLE),
      loginAsActionPolicyRuleReviewer: () =>
        browserAuth.loginWithCustomRole(ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE),
      loginAsExecutionHistoryViewer: () =>
        browserAuth.loginWithCustomRole(EXECUTION_HISTORY_PAGE_READ_ROLE),
    });
  },
  pageObjects: async ({ pageObjects, page, kbnUrl }, use) => {
    await use(extendPageObjects(pageObjects, page, kbnUrl));
  },
  apiServices: [
    async (
      { apiServices, esClient, kbnClient, log, config, requestAuth },
      use: (extendedApiServices: AlertingApiServicesFixture) => Promise<void>
    ) => {
      const extendedApiServices: AlertingApiServicesFixture = {
        ...apiServices,
        alertingV2: buildAlertingApiServices({
          esClient,
          kbnClient,
          log,
          config,
          requestAuth,
        }),
      };
      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});

export {
  buildAlertEvent,
  buildCreateRuleData,
  buildCreateActionPolicyData,
  buildWorkflowYaml,
} from '../../builders';
export * as testData from '../../constants';
export type { AlertingPageObjects } from './page_objects';
export type { AlertingApp } from './page_objects/alerting_navigation';
