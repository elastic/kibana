/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { KibanaRole, KibanaUrl, ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

/**
 * RBAC behavior of the Stack alerts page row actions.
 *
 * The "modify" row actions (Acknowledge, Mark as untracked, Mute/Unmute, Edit
 * tags) are gated on whether the user can modify alerts. For the Stack alerts
 * page that is derived from the `stackAlertsOnly` feature: its `all` privilege
 * grants the RAC `alert:all` / `rule:mute_alerts` privileges and exposes an
 * explicit `write` UI capability, while its `read` privilege only grants alert
 * read. The `write` capability is what `useCanModifyAlerts` reads and passes to
 * the alerts table, so:
 *  - a `stackAlertsOnly: all` user (no rule-create authorization) still sees the
 *    modify actions, purely because of the `write` capability, and
 *  - a `stackAlertsOnly: read` user sees the table and the view-only actions but
 *    none of the modify actions.
 *
 * The read-only view actions ("View rule details", "View alert details") are
 * always available and are asserted for both personas as a control.
 *
 * The header rule stats (rule count, disabled/snoozed/errors, and the "Manage
 * Rules" button) and the rule-name link are gated separately, on rule-read
 * authorization: a `stackAlertsOnly` user (alerts only, no rule read) does not
 * see the stats and the rule name renders as plain text, while a
 * `stackAlerts: read` ("Stack Rules") user sees the stats and a clickable rule
 * name. Stack alerts have no standalone alert-details page, so the rule-name
 * gating is also asserted in the alert-details flyout opened from the table.
 */
const STACK_ALERTS_PATH = '/app/management/insightsAndAlerting/triggersActionsAlerts';

// Write alias for the Stack alerts-as-data index. Kibana provisions it at boot,
// so the alert document can be indexed straight into it.
const STACK_ALERTS_INDEX = '.alerts-stack.alerts-default';
const STACK_ALERTS_INDEX_PATTERN = '.alerts-stack.alerts-*';

// Index-threshold is registered under the `stackAlertsOnly` feature (consumers
// `stackAlerts` + `alerts`), so an alert with the `alerts` consumer is readable
// by a `stackAlertsOnly` user and shows on the page (a non-SIEM rule type).
const RULE_TYPE_ID = '.index-threshold';
const RULE_CONSUMER = 'alerts';
const RULE_NAME = 'Scout Stack Alerts RBAC index threshold';

const TABLE_LOADED_SUBJ = 'alertsTableIsLoaded';
const TABLE_LOADING_SUBJ = 'internalAlertsPageLoading';
const ROW_ACTIONS_MORE_SUBJ = 'alertsTableRowActionMore';
const ACTIONS_MENU_SUBJ = 'alertsTableActionsMenu';

const VIEW_ACTION_SUBJS = ['viewRuleDetails', 'viewAlertDetailsFlyout'];
const MODIFY_ACTION_SUBJS = ['acknowledge-alert', 'untrackAlert', 'editTags'];

// Row action that links to the rule behind the alert.
const VIEW_RULE_DETAILS_SUBJ = 'viewRuleDetails';
// Page-header rule stats and the "Manage Rules" link, rendered by `useRuleStats`.
const MANAGE_RULES_SUBJ = 'manageRulesPageButton';
const RULE_STAT_SUBJS = ['statRuleCount', 'statDisabled', 'statMuted', 'statErrors'];

// The rule-name cell renders as a link to the rule details page only when the
// user can read the alert's rule; otherwise it is plain text.
const RULE_NAME_LINK_SUBJ = 'alertRuleNameLink';
const RULE_NAME_TEXT_SUBJ = 'alertRuleName';
// Scope rule-name assertions to the single ingested alert's row.
const ruleNameLinkInRow = (page: ScoutPage) =>
  page.locator(`[data-gridcell-row-index="0"] [data-test-subj="${RULE_NAME_LINK_SUBJ}"]`);
const ruleNameTextInRow = (page: ScoutPage) =>
  page.locator(`[data-gridcell-row-index="0"] [data-test-subj="${RULE_NAME_TEXT_SUBJ}"]`);

// Stack alerts have no standalone alert-details page; the alert-details surface is
// the flyout opened from the alerts table, whose overview tab reuses the same
// gated rule-name cell. Scope flyout rule-name assertions to the overview panel.
const FLYOUT_OVERVIEW_PANEL_SUBJ = 'alertFlyoutOverviewTabPanel';
const ROW_EXPAND_SUBJ = 'expand-event';
const flyoutRuleNameLink = (page: ScoutPage) =>
  page.locator(
    `[data-test-subj="${FLYOUT_OVERVIEW_PANEL_SUBJ}"] [data-test-subj="${RULE_NAME_LINK_SUBJ}"]`
  );
const flyoutRuleNameText = (page: ScoutPage) =>
  page.locator(
    `[data-test-subj="${FLYOUT_OVERVIEW_PANEL_SUBJ}"] [data-test-subj="${RULE_NAME_TEXT_SUBJ}"]`
  );

// `stackAlertsOnly: all` grants alert:all + rule:mute_alerts and the `write` UI
// capability, but NO rule-create authorization — so any modify actions shown are
// attributable to the `write` capability alone.
// The filter controls issue a `field_caps` call against `.alerts-*` which
// requires a base index read privilege (not covered by RAC alerting privileges
// alone). Adding it here isolates the RBAC behavior under test.
const ALERTS_INDEX_PRIVILEGES = [{ names: ['.alerts-*'], privileges: ['read'] }];

const STACK_ALERTS_ONLY_ALL_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: ALERTS_INDEX_PRIVILEGES },
  kibana: [{ base: [], feature: { stackAlertsOnly: ['all'] }, spaces: ['*'] }],
};

// `stackAlertsOnly: read` grants alert read (so the table renders) but no write
// capability and no rule read/create authorization.
const STACK_ALERTS_ONLY_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: ALERTS_INDEX_PRIVILEGES },
  kibana: [{ base: [], feature: { stackAlertsOnly: ['read'] }, spaces: ['*'] }],
};

// `stackAlerts: read` (the "Stack Rules" feature) grants rule read, which is what
// unlocks the header rule stats. Used to assert the stats appear for a rule-read
// user (the counterpart of the `stackAlertsOnly` personas above, which cannot).
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

    // The first navigation compiles the alerts app bundle in dev mode; give the
    // tests ample budget (a no-op against the pre-built distributable in CI).
    test.beforeEach(() => {
      test.setTimeout(180_000);
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

    /**
     * Navigates to the Stack alerts page and opens the row actions kebab for the
     * single ingested alert, retrying navigation until the alert is queryable
     * (alerts-as-data reads can lag behind the `refresh: 'wait_for'` index).
     */
    /**
     * Navigates to the Stack alerts page and waits for the alerts table to finish
     * loading, retrying until the ingested alert is queryable (alerts-as-data
     * reads can lag behind the `refresh: 'wait_for'` index).
     */
    const gotoLoadedAlertsTable = async (page: ScoutPage, kbnUrl: KibanaUrl) => {
      await expect(async () => {
        await page.goto(kbnUrl.get(STACK_ALERTS_PATH), {
          waitUntil: 'domcontentloaded',
          timeout: 60_000,
        });
        await page.testSubj
          .locator(TABLE_LOADING_SUBJ)
          .waitFor({ state: 'hidden', timeout: 30_000 });
        await page.testSubj
          .locator(TABLE_LOADED_SUBJ)
          .waitFor({ state: 'visible', timeout: 30_000 });
      }).toPass({ timeout: 90_000, intervals: [3_000] });
    };

    /**
     * Opens the alert-details flyout for the ingested alert's row and waits for
     * the overview tab (which renders the rule-name cell) to be visible.
     */
    const openAlertDetailsFlyout = async (page: ScoutPage) => {
      await page
        .locator(`[data-gridcell-row-index="0"] [data-test-subj="${ROW_EXPAND_SUBJ}"]`)
        .click();
      await page.testSubj.locator('alertFlyout').waitFor({ state: 'visible', timeout: 10_000 });
      await page.testSubj
        .locator(FLYOUT_OVERVIEW_PANEL_SUBJ)
        .waitFor({ state: 'visible', timeout: 10_000 });
    };

    const openRowActionsMenu = async (page: ScoutPage, kbnUrl: KibanaUrl) => {
      await expect(async () => {
        await page.goto(kbnUrl.get(STACK_ALERTS_PATH), {
          waitUntil: 'domcontentloaded',
          timeout: 60_000,
        });
        await page.testSubj
          .locator(TABLE_LOADING_SUBJ)
          .waitFor({ state: 'hidden', timeout: 30_000 });
        await page.testSubj
          .locator(TABLE_LOADED_SUBJ)
          .waitFor({ state: 'visible', timeout: 30_000 });
        await page
          .locator(`[data-gridcell-row-index="0"] [data-test-subj="${ROW_ACTIONS_MORE_SUBJ}"]`)
          .click();
        await page.testSubj
          .locator(ACTIONS_MENU_SUBJ)
          .waitFor({ state: 'visible', timeout: 10_000 });
      }).toPass({ timeout: 90_000, intervals: [3_000] });
    };

    test('stackAlertsOnly:all shows the modify actions via the write capability', async ({
      browserAuth,
      page,
      kbnUrl,
    }) => {
      await browserAuth.loginWithCustomRole(STACK_ALERTS_ONLY_ALL_ROLE);
      await openRowActionsMenu(page, kbnUrl);

      await test.step('shows the view-only actions', async () => {
        for (const subj of VIEW_ACTION_SUBJS) {
          await expect(page.testSubj.locator(subj)).toBeVisible();
        }
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
    }) => {
      await browserAuth.loginWithCustomRole(STACK_ALERTS_ONLY_READ_ROLE);
      await openRowActionsMenu(page, kbnUrl);

      await test.step('shows the view-only actions', async () => {
        for (const subj of VIEW_ACTION_SUBJS) {
          await expect(page.testSubj.locator(subj)).toBeVisible();
        }
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
    }) => {
      // The header rule stats (rule count, disabled/snoozed/errors, and the
      // "Manage Rules" button) and the rule-name link are gated on rule-read
      // authorization. A `stackAlertsOnly: read` user can read alerts but not
      // rules, so both must be hidden even though the page itself loads.
      await browserAuth.loginWithCustomRole(STACK_ALERTS_ONLY_READ_ROLE);
      await gotoLoadedAlertsTable(page, kbnUrl);

      await test.step('hides the rule stats and Manage Rules button', async () => {
        for (const subj of RULE_STAT_SUBJS) {
          await expect(page.testSubj.locator(subj)).toBeHidden();
        }
        await expect(page.testSubj.locator(MANAGE_RULES_SUBJ)).toBeHidden();
      });

      await test.step('renders the rule name as plain text (no link)', async () => {
        await expect(ruleNameTextInRow(page)).toBeVisible();
        await expect(ruleNameLinkInRow(page)).toBeHidden();
      });

      await test.step('renders the rule name as plain text in the alert-details flyout', async () => {
        await openAlertDetailsFlyout(page);
        await expect(flyoutRuleNameText(page)).toBeVisible();
        await expect(flyoutRuleNameLink(page)).toBeHidden();
      });
    });

    test('shows the rule stats and rule-name link with rule-read authorization', async ({
      browserAuth,
      page,
      kbnUrl,
    }) => {
      // A `stackAlerts: read` (Stack Rules) user has rule-read authorization, so
      // the header rule stats, the "Manage Rules" button, and the rule-name link
      // are rendered.
      await browserAuth.loginWithCustomRole(STACK_RULES_READ_ROLE);
      await gotoLoadedAlertsTable(page, kbnUrl);

      await test.step('shows the rule stats and Manage Rules button', async () => {
        for (const subj of RULE_STAT_SUBJS) {
          await expect(page.testSubj.locator(subj)).toBeVisible();
        }
        await expect(page.testSubj.locator(MANAGE_RULES_SUBJ)).toBeVisible();
      });

      await test.step('renders the rule name as a link', async () => {
        await expect(ruleNameLinkInRow(page)).toBeVisible();
      });

      await test.step('renders the rule name as a link in the alert-details flyout', async () => {
        await openAlertDetailsFlyout(page);
        await expect(flyoutRuleNameLink(page)).toBeVisible();
      });

      await test.step('shows the "View rule details" row link', async () => {
        await openRowActionsMenu(page, kbnUrl);
        await expect(page.testSubj.locator(VIEW_RULE_DETAILS_SUBJ)).toBeVisible();
      });
    });
  }
);
