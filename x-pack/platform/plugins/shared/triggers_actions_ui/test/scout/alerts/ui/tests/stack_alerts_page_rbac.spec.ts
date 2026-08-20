/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { KibanaRole } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { STACK_ALERTS_INDEX, STACK_ALERTS_INDEX_PATTERN, test } from '../fixtures';

/**
 * RBAC tests for the Stack alerts page.
 *
 * Covers three privilege axes:
 *  - Modify actions (ack/untrack/mute/tags): gated on `stackAlertsOnly.write` capability.
 *  - "View rule details" row action: gated on per-rule-type read authorization.
 *  - Rule stats, "Manage Rules" button, and rule-name link: gated on rule-read.
 *
 * Stack alerts has no standalone alert-details page; rule-name gating is also
 * verified in the flyout.
 */
// .index-threshold is in the stackAlertsOnly feature (consumers stackAlerts + alerts),
// so a stackAlertsOnly user can see this alert.
const RULE_TYPE_ID = '.index-threshold';
const RULE_CONSUMER = 'alerts';
const RULE_NAME = 'Scout Stack Alerts RBAC index threshold';

// Always visible; not gated on any privilege.
const VIEW_ACTION_SUBJS = ['viewAlertDetailsFlyout'];
const MODIFY_ACTION_SUBJS = ['acknowledge-alert', 'untrackAlert', 'editTags'];

// Gated on rule-read; hidden for stackAlertsOnly, visible for stackAlerts:read.
const VIEW_RULE_DETAILS_SUBJ = 'viewRuleDetails';
const MANAGE_RULES_SUBJ = 'manageRulesPageButton';
const RULE_STAT_SUBJS = ['statRuleCount', 'statDisabled', 'statMuted', 'statErrors'];

// ES read on .alerts-* is needed for the filter controls' field_caps call,
// which isn't covered by RAC alerting privileges alone.
const ALERTS_INDEX_PRIVILEGES = [{ names: ['.alerts-*'], privileges: ['read'] }];

// alert:all + rule:mute_alerts + write UI capability; no rule-read.
const STACK_ALERTS_ONLY_ALL_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: ALERTS_INDEX_PRIVILEGES },
  kibana: [{ base: [], feature: { stackAlertsOnly: ['all'] }, spaces: ['*'] }],
};

// alert:read only; no write capability, no rule-read.
const STACK_ALERTS_ONLY_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: ALERTS_INDEX_PRIVILEGES },
  kibana: [{ base: [], feature: { stackAlertsOnly: ['read'] }, spaces: ['*'] }],
};

// alert:read + rule:read; unlocks rule stats, rule-name links, and View rule details.
const STACK_RULES_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { stackAlerts: ['read'] }, spaces: ['*'] }],
};

test.describe(
  'Stack alerts page - modify actions RBAC',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    const cleanupTag = `stack-alerts-rbac-scout-test-${uuidv4()}`;

    test.beforeAll(async ({ esClient }) => {
      const now = new Date().toISOString();
      const alertUuid = `${cleanupTag}-alert`;
      const response = await esClient.index({
        index: STACK_ALERTS_INDEX,
        refresh: 'wait_for',
        document: {
          '@timestamp': now,
          'event.kind': 'signal',
          'event.action': 'active',
          'kibana.alert.uuid': alertUuid,
          'kibana.alert.instance.id': '*',
          'kibana.alert.status': 'active',
          'kibana.alert.workflow_status': 'open',
          'kibana.alert.start': now,
          'kibana.alert.time_range': { gte: now },
          'kibana.alert.rule.name': RULE_NAME,
          'kibana.alert.rule.uuid': `${cleanupTag}-rule`,
          'kibana.alert.rule.rule_type_id': RULE_TYPE_ID,
          'kibana.alert.rule.category': 'Index threshold',
          'kibana.alert.rule.consumer': RULE_CONSUMER,
          'kibana.alert.rule.producer': 'stackAlerts',
          'kibana.space_ids': ['default'],
          'kibana.version': '8.0.0',
          tags: [cleanupTag],
        },
      });

      if (response.result !== 'created') {
        throw new Error(`Failed to ingest Stack alerts RBAC alert document: ${response.result}`);
      }
    });

    test.afterAll(async ({ esClient }) => {
      await esClient
        .deleteByQuery({
          index: STACK_ALERTS_INDEX_PATTERN,
          query: { term: { tags: cleanupTag } },
          refresh: true,
          conflicts: 'proceed',
          ignore_unavailable: true,
        })
        .catch(() => {});
    });

    test('stackAlertsOnly:all shows the modify actions via the write capability', async ({
      browserAuth,
      page,
      kbnUrl,
      pageObjects: { stackAlertsPage },
    }) => {
      await browserAuth.loginWithCustomRole(STACK_ALERTS_ONLY_ALL_ROLE);
      await stackAlertsPage.openRowActionsMenu(kbnUrl);

      await test.step('shows the view-only actions', async () => {
        for (const subj of VIEW_ACTION_SUBJS) {
          await expect(page.testSubj.locator(subj)).toBeVisible();
        }
      });

      await test.step('hides "View rule details" (no rule-read)', async () => {
        await expect(page.testSubj.locator(VIEW_RULE_DETAILS_SUBJ)).toBeHidden();
      });

      await test.step('shows the modify actions', async () => {
        for (const subj of MODIFY_ACTION_SUBJS) {
          await expect(page.testSubj.locator(subj)).toBeVisible();
        }
      });
    });

    test('stackAlertsOnly:read hides the modify actions but keeps the view actions', async ({
      browserAuth,
      page,
      kbnUrl,
      pageObjects: { stackAlertsPage },
    }) => {
      await browserAuth.loginWithCustomRole(STACK_ALERTS_ONLY_READ_ROLE);
      await stackAlertsPage.openRowActionsMenu(kbnUrl);

      await test.step('shows the view-only actions', async () => {
        for (const subj of VIEW_ACTION_SUBJS) {
          await expect(page.testSubj.locator(subj)).toBeVisible();
        }
      });

      await test.step('hides "View rule details" (no rule-read)', async () => {
        await expect(page.testSubj.locator(VIEW_RULE_DETAILS_SUBJ)).toBeHidden();
      });

      await test.step('hides the modify actions', async () => {
        for (const subj of MODIFY_ACTION_SUBJS) {
          await expect(page.testSubj.locator(subj)).toBeHidden();
        }
      });
    });

    test('hides the rule stats and rule-name link without rule-read authorization', async ({
      browserAuth,
      page,
      kbnUrl,
      pageObjects: { stackAlertsPage },
    }) => {
      await browserAuth.loginWithCustomRole(STACK_ALERTS_ONLY_READ_ROLE);
      await stackAlertsPage.gotoLoaded(kbnUrl);

      await test.step('hides the rule stats and Manage Rules button', async () => {
        for (const subj of RULE_STAT_SUBJS) {
          await expect(page.testSubj.locator(subj)).toBeHidden();
        }
        await expect(page.testSubj.locator(MANAGE_RULES_SUBJ)).toBeHidden();
      });

      await test.step('renders the rule name as plain text (no link)', async () => {
        await expect(stackAlertsPage.ruleNameTextInRow()).toBeVisible();
        await expect(stackAlertsPage.ruleNameLinkInRow()).toBeHidden();
      });

      await test.step('renders the rule name as plain text in the alert-details flyout', async () => {
        await stackAlertsPage.openAlertDetailsFlyout();
        await expect(stackAlertsPage.flyoutRuleNameText()).toBeVisible();
        await expect(stackAlertsPage.flyoutRuleNameLink()).toBeHidden();
      });
    });

    test('shows the rule stats and rule-name link with rule-read authorization', async ({
      browserAuth,
      page,
      kbnUrl,
      pageObjects: { stackAlertsPage },
    }) => {
      await browserAuth.loginWithCustomRole(STACK_RULES_READ_ROLE);
      await stackAlertsPage.gotoLoaded(kbnUrl);

      await test.step('shows the rule stats and Manage Rules button', async () => {
        for (const subj of RULE_STAT_SUBJS) {
          await expect(page.testSubj.locator(subj)).toBeVisible();
        }
        await expect(page.testSubj.locator(MANAGE_RULES_SUBJ)).toBeVisible();
      });

      await test.step('renders the rule name as a link', async () => {
        await expect(stackAlertsPage.ruleNameLinkInRow()).toBeVisible();
      });

      await test.step('renders the rule name as a link in the alert-details flyout', async () => {
        await stackAlertsPage.openAlertDetailsFlyout();
        await expect(stackAlertsPage.flyoutRuleNameLink()).toBeVisible();
      });

      await test.step('shows the "View rule details" row link', async () => {
        await stackAlertsPage.openRowActionsMenu(kbnUrl);
        await expect(page.testSubj.locator(VIEW_RULE_DETAILS_SUBJ)).toBeVisible();
      });
    });
  }
);
