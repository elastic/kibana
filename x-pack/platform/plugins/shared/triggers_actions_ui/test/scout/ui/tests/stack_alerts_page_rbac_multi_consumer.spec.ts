/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { encode as encodeRison } from '@kbn/rison';
import type { KibanaRole, KibanaUrl, ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

/**
 * Per-consumer rule-read gating of the rule-name link on the Stack alerts page:
 * rule read is authorized per rule type *and consumer*, so the shared cell links
 * the rule name only when the user can read the alert's rule for its consumer.
 *
 * Stateful only: the mismatch needs two features authorizing the same rule type
 * under different consumers, and the Observability features that supply the
 * second consumer aren't loaded in serverless Search. The serverless-tagged
 * `stack_alerts_page_rbac` suite covers the rule-read-vs-alert-read split there.
 *
 * `.es-query` is a stack rule type that is also a shared observability rule type,
 * so it can carry either consumer. The persona has `stackAlerts: read` (rule read
 * for stack consumers) and `observabilityAlerts: read` (alert read, no rule read,
 * for obs consumers incl. `logs`), so both alerts render but only the stack one's
 * rule is readable.
 */
const STACK_ALERTS_PATH = '/app/management/insightsAndAlerting/triggersActionsAlerts';

// Both `.es-query` alerts land here (the rule type's AAD context is `stack`).
const STACK_ALERTS_INDEX = '.alerts-stack.alerts-default';
const STACK_ALERTS_INDEX_PATTERN = '.alerts-stack.alerts-*';

const RULE_TYPE_ID = '.es-query';

// Consumer the persona can read the rule for vs. the one it cannot.
const STACK_CONSUMER = 'stackAlerts';
const LOGS_CONSUMER = 'logs';

const STACK_RULE_NAME = 'Scout Stack ES query (stackAlerts consumer)';
const LOGS_RULE_NAME = 'Scout Stack ES query (logs consumer)';

const TABLE_LOADED_SUBJ = 'alertsTableIsLoaded';
const TABLE_LOADING_SUBJ = 'internalAlertsPageLoading';

// Rule-name cell: a link when the rule is readable, plain text otherwise. Each
// navigation filters the table to one alert, so row 0 is that alert.
const RULE_NAME_LINK_SUBJ = 'alertRuleNameLink';
const RULE_NAME_TEXT_SUBJ = 'alertRuleName';
const ruleNameLinkInRow = (page: ScoutPage) =>
  page.locator(`[data-gridcell-row-index="0"] [data-test-subj="${RULE_NAME_LINK_SUBJ}"]`);
const ruleNameTextInRow = (page: ScoutPage) =>
  page.locator(`[data-gridcell-row-index="0"] [data-test-subj="${RULE_NAME_TEXT_SUBJ}"]`);

// Stack alerts have no standalone details page; the details surface is the
// flyout, whose overview tab reuses the same gated rule-name cell.
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

// `stackAlerts: read` → rule + alert read for stack consumers (not `logs`).
// `observabilityAlerts: read` → alert read only (no rule read) for obs consumers
// incl. `logs`, so the logs-consumer alert renders but its rule stays unreadable.
const STACK_RULES_AND_OBS_ALERTS_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: { stackAlerts: ['read'], observabilityAlerts: ['read'] },
      spaces: ['*'],
    },
  ],
};

test.describe(
  'Stack alerts page - multi-consumer rule link RBAC',
  { tag: [...tags.stateful.classic] },
  () => {
    const cleanupTag = `stack-alerts-multi-consumer-rbac-scout-test-${uuidv4()}`;
    const stackRuleUuid = `${cleanupTag}-stack-rule`;
    const logsRuleUuid = `${cleanupTag}-logs-rule`;

    const buildAlertDoc = ({
      ruleName,
      ruleUuid,
      consumer,
      timestamp,
    }: {
      ruleName: string;
      ruleUuid: string;
      consumer: string;
      timestamp: string;
    }) => ({
      '@timestamp': timestamp,
      'event.kind': 'signal',
      'event.action': 'active',
      'kibana.alert.uuid': `${ruleUuid}-alert`,
      'kibana.alert.instance.id': '*',
      'kibana.alert.status': 'active',
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.start': timestamp,
      'kibana.alert.time_range': { gte: timestamp },
      'kibana.alert.rule.name': ruleName,
      'kibana.alert.rule.uuid': ruleUuid,
      'kibana.alert.rule.rule_type_id': RULE_TYPE_ID,
      'kibana.alert.rule.category': 'Elasticsearch query',
      'kibana.alert.rule.consumer': consumer,
      'kibana.alert.rule.producer': 'stackAlerts',
      'kibana.space_ids': ['default'],
      'kibana.version': '8.0.0',
      tags: [cleanupTag],
    });

    test.beforeAll(async ({ esClient }) => {
      const now = new Date().toISOString();
      const operations = [
        { create: { _index: STACK_ALERTS_INDEX, _id: `${stackRuleUuid}-alert` } },
        buildAlertDoc({
          ruleName: STACK_RULE_NAME,
          ruleUuid: stackRuleUuid,
          consumer: STACK_CONSUMER,
          timestamp: now,
        }),
        { create: { _index: STACK_ALERTS_INDEX, _id: `${logsRuleUuid}-alert` } },
        buildAlertDoc({
          ruleName: LOGS_RULE_NAME,
          ruleUuid: logsRuleUuid,
          consumer: LOGS_CONSUMER,
          timestamp: now,
        }),
      ];

      const bulkResponse = await esClient.bulk({ operations, refresh: 'wait_for' });
      if (bulkResponse.errors) {
        const failures = bulkResponse.items
          .filter((item) => item.create?.error)
          .map((item) => item.create?.error?.reason);
        throw new Error(
          `Failed to ingest Stack alerts multi-consumer RBAC alert documents: ${failures.join(
            '; '
          )}`
        );
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

    // Filters the table (via the URL-synced search bar) to `ruleUuid`'s single
    // alert, retrying until it is queryable (reads can lag the indexed doc).
    const gotoAlertForRule = async (page: ScoutPage, kbnUrl: KibanaUrl, ruleUuid: string) => {
      const searchBarParams = encodeRison({
        kuery: `kibana.alert.rule.uuid: "${ruleUuid}"`,
        rangeFrom: 'now-1y',
        rangeTo: 'now',
      });
      const url = kbnUrl.get(
        `${STACK_ALERTS_PATH}?searchBarParams=${encodeURIComponent(searchBarParams)}`
      );

      await expect(async () => {
        // `domcontentloaded` (not the default `load`) so navigation resolves
        // without waiting on the app's lazily-built JS chunk; the table waits
        // below then absorb the first-load compilation in dev mode.
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.testSubj
          .locator(TABLE_LOADING_SUBJ)
          .waitFor({ state: 'hidden', timeout: 30_000 });
        await page.testSubj
          .locator(TABLE_LOADED_SUBJ)
          .waitFor({ state: 'visible', timeout: 30_000 });
        // TABLE_LOADED_SUBJ visible means ≥1 row exists; assert exactly one alert row.
        await expect(page.locator('[data-gridcell-row-index="1"]')).toHaveCount(0);
      }).toPass({ timeout: 90_000, intervals: [3_000] });
    };

    // Opens the alert-details flyout for row 0 and waits for its overview tab.
    const openAlertDetailsFlyout = async (page: ScoutPage) => {
      await page
        .locator(`[data-gridcell-row-index="0"] [data-test-subj="${ROW_EXPAND_SUBJ}"]`)
        .click();
      await page.testSubj.locator('alertFlyout').waitFor({ state: 'visible', timeout: 10_000 });
      await page.testSubj
        .locator(FLYOUT_OVERVIEW_PANEL_SUBJ)
        .waitFor({ state: 'visible', timeout: 10_000 });
    };

    test('links the rule name when the rule is readable for the alert consumer', async ({
      browserAuth,
      page,
      kbnUrl,
    }) => {
      // Generous budget: the first navigation compiles the alerts app bundle in
      // dev mode (a no-op against the pre-built distributable used in CI).
      test.setTimeout(180_000);
      // The `stackAlerts`-consumer alert's rule is readable via `stackAlerts: read`.
      await browserAuth.loginWithCustomRole(STACK_RULES_AND_OBS_ALERTS_ROLE);
      await gotoAlertForRule(page, kbnUrl, stackRuleUuid);

      await test.step('links the rule name in the table', async () => {
        await expect(ruleNameLinkInRow(page)).toBeVisible();
        await expect(ruleNameTextInRow(page)).toBeHidden();
      });

      await test.step('links the rule name in the alert-details flyout', async () => {
        await openAlertDetailsFlyout(page);
        await expect(flyoutRuleNameLink(page)).toBeVisible();
      });
    });

    test('hides the rule link when the rule is not readable for the alert consumer', async ({
      browserAuth,
      page,
      kbnUrl,
    }) => {
      test.setTimeout(180_000);
      // The `logs`-consumer alert is visible via `observabilityAlerts: read`, but
      // its rule is not readable (no `logs` rule read), so the name is plain text.
      await browserAuth.loginWithCustomRole(STACK_RULES_AND_OBS_ALERTS_ROLE);
      await gotoAlertForRule(page, kbnUrl, logsRuleUuid);

      await test.step('renders the rule name as plain text in the table', async () => {
        await expect(ruleNameTextInRow(page)).toBeVisible();
        await expect(ruleNameLinkInRow(page)).toBeHidden();
      });

      await test.step('renders the rule name as plain text in the alert-details flyout', async () => {
        await openAlertDetailsFlyout(page);
        await expect(flyoutRuleNameText(page)).toBeVisible();
        await expect(flyoutRuleNameLink(page)).toBeHidden();
      });
    });
  }
);
