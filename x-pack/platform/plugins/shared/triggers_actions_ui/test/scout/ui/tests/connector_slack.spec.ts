/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, KbnClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  test,
  CONNECTORS_APP_PATH,
  CONNECTORS_LIST_SELECTORS,
  defineIndexThresholdRule,
} from '../fixtures';

// Two FTR tests in the connector-page describe were `it.skip`'d due to the
// Slack channel-allowlist requirement (PR #167150). They remain out of scope
// here for the same reason — preserving FTR parity.

const RULES_LIST_SUBJ = 'rulesList';

interface RuleFindResponse {
  data: Array<{ id: string; name: string }>;
}

const findRuleIdByName = async (
  kbnClient: KbnClient,
  name: string
): Promise<string | undefined> => {
  const res = await kbnClient.request<RuleFindResponse>({
    method: 'GET',
    path: `/api/alerting/rules/_find?search=${encodeURIComponent(name)}&search_fields=name`,
    headers: { 'kbn-xsrf': 'scout' },
  });
  return res.data?.data?.find((r) => r.name === name)?.id;
};

const deleteRuleById = async (kbnClient: KbnClient, id: string) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/alerting/rule/${id}`,
    headers: { 'kbn-xsrf': 'scout' },
    ignoreErrors: [404],
  });
};

const selectConnectorInRuleAction = async (page: ScoutPage, connectorName: string) => {
  await page.testSubj.click('ruleActionsAddActionButton');
  await expect(page.testSubj.locator('ruleActionsConnectorsModal')).toBeVisible();
  // Connector cards inside the modal carry their name as visible text on a
  // clickable button. Use a role+name match so we don't depend on dynamic ids.
  await page.testSubj
    .locator('ruleActionsConnectorsModal')
    .getByRole('button', { name: connectorName })
    .click();
};

test.describe('Slack connector', { tag: tags.stateful.classic }, () => {
  const createdConnectorIds: string[] = [];
  const createdRuleNames: string[] = [];

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ kbnClient }) => {
    for (const name of createdRuleNames) {
      const id = await findRuleIdByName(kbnClient, name);
      if (id) {
        await deleteRuleById(kbnClient, id);
      }
    }
    createdRuleNames.length = 0;
  });

  test.afterAll(async ({ apiServices }) => {
    await Promise.allSettled(
      createdConnectorIds.map((id) => apiServices.alerting.connectors.delete(id))
    );
    createdConnectorIds.length = 0;
  });

  test('shows only the Slack webhook card, not the Slack API card', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    await page.testSubj.click('createConnectorButton');

    // The webhook card is always shown; the Slack-API connector card was
    // removed in the connector-types matrix update (PR #167150) and should
    // no longer appear in the picker.
    await expect(page.testSubj.locator('.slack-card')).toBeVisible();
    await expect(page.testSubj.locator('.slack_api-card')).toBeHidden();
  });

  test('creates a webhook Slack connector via the UI', async ({ page, apiServices, kbnUrl }) => {
    const connectorName = `scout-slack-${Date.now()}`;
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));

    await page.testSubj.click('createConnectorButton');
    await page.testSubj.click('.slack-card');

    await page.testSubj.locator('nameInput').fill(connectorName);
    await page.testSubj.locator('slackWebhookUrlInput').fill('https://test.com');

    const saveButton = page.testSubj.locator('create-connector-flyout-save-btn');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Created '${connectorName}'`
    );

    // Verify the connector appears in the list with type 'Slack'.
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
    const searchBox = page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT);
    await searchBox.fill(connectorName);
    await searchBox.press('Enter');
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();

    const rows = page.testSubj.locator('connectors-row');
    await expect(rows).toHaveCount(1);
    await expect(rows.getByTestId('connectorsTableCell-name')).toContainText(connectorName);
    await expect(rows.getByTestId('connectorsTableCell-actionType')).toContainText('Slack');

    // Track the connector for cleanup.
    const allConnectors = (await apiServices.alerting.connectors.getAll()) as Array<{
      id: string;
      name: string;
    }>;
    const created = allConnectors.find((c) => c.name === connectorName);
    expect(created).toBeDefined();
    createdConnectorIds.push(created!.id);
  });

  test('saves a rule with a webhook Slack connector as its action', async ({
    page,
    apiServices,
  }) => {
    // Pre-create the connector via API — the per-test connector creation is
    // already covered above. This test is about the rule-creation UI flow
    // attaching the connector as an action.
    const connectorName = `scout-slack-rule-${Date.now()}`;
    const created = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: '.slack',
      config: {},
      secrets: { webhookUrl: 'https://test.com' },
    });
    createdConnectorIds.push(created.id);

    const ruleName = `scout-slack-rule-${Date.now()}`;
    createdRuleNames.push(ruleName);

    await page.gotoApp('rules');

    await defineIndexThresholdRule(page, ruleName);
    await selectConnectorInRuleAction(page, connectorName);

    await page.testSubj.click('rulePageFooterSaveButton');

    // Some rule-types prompt a confirmation modal on save. Click confirm if
    // it appears, otherwise carry on.
    const confirmButton = page.testSubj.locator('confirmModalConfirmButton');
    await confirmButton.click({ timeout: 3000 }).catch(() => {
      // No confirm modal — index-threshold doesn't always prompt one.
    });

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Created rule "${ruleName}"`
    );

    // Verify the rule appears in the rules list.
    await page.gotoApp('rules');
    await expect(page.testSubj.locator(RULES_LIST_SUBJ)).toBeVisible();
    await expect(
      page.testSubj.locator(RULES_LIST_SUBJ).locator(`[title="${ruleName}"]`)
    ).toBeVisible();
  });

  // TODO: Two Slack Web API tests from the FTR (`it.skip`) are not yet
  // migrated because the Slack API connector form requires a channel allowlist
  // (PR #167150). Without at least one allowed channel ID configured, saving
  // the connector fails with "Failed to retrieve Slack channels list".
  //
  // Tests to add once unblocked:
  //   1. creates a Slack API connector via the UI — click `.slack_apiButton`,
  //      fill `secrets.token-input`, save, assert toast + list entry.
  //   2. saves a rule with a Slack API connector as its action — same
  //      index-threshold rule flow as test 3 above but using the API connector.
  //
  // Unblock via either:
  //   a. Add `xpack.actions.preconfiguredChannels: [{ id: 'fake', ... }]` to
  //      Scout's stateful/classic Kibana startup args.
  //   b. Mock the Slack channels endpoint with `page.route()`.
});
