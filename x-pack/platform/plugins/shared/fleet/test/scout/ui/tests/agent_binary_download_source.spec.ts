/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import {
  setupFleetServer,
  createAgentPolicy,
  createDownloadSource,
  cleanupAgentPolicies,
  cleanupDownloadSources,
} from '../common/api_helpers';
import {
  SETTINGS_TAB,
  AGENT_BINARY_SOURCES_TABLE,
  AGENT_BINARY_SOURCES_TABLE_ACTIONS,
  AGENT_BINARY_SOURCES_FLYOUT,
  AGENT_POLICY_FORM,
  CONFIRM_MODAL,
} from '../common/selectors';

test.describe('Agent binary download source section', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient, esClient }) => {
    await setupFleetServer(kbnClient, esClient);
  });

  test.beforeEach(async ({ kbnClient, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await cleanupDownloadSources(kbnClient);
    await cleanupAgentPolicies(kbnClient);
  });

  test.afterEach(async ({ kbnClient }) => {
    try {
      await cleanupDownloadSources(kbnClient);
      await cleanupAgentPolicies(kbnClient);
    } catch {
      // Ignore
    }
  });

  test('has a default value and allows to edit an existing object', async ({ page }) => {
    await page.gotoApp('fleet');
    await page.testSubj.locator(SETTINGS_TAB).click();

    const tableRows = page.testSubj.locator(AGENT_BINARY_SOURCES_TABLE).locator('tr');
    await expect(tableRows).toHaveCount(2);
    const defaultRow = page.testSubj
      .locator(AGENT_BINARY_SOURCES_TABLE)
      .getByRole('row')
      .filter({
        has: page.testSubj.locator(AGENT_BINARY_SOURCES_TABLE_ACTIONS.DEFAULT_VALUE),
      });
    await expect(
      defaultRow.locator(`[data-test-subj="${AGENT_BINARY_SOURCES_TABLE_ACTIONS.HOST}"]`)
    ).toContainText('https://artifacts.elastic.co/downloads/');
    await expect(
      defaultRow.locator(`[data-test-subj="${AGENT_BINARY_SOURCES_TABLE_ACTIONS.DEFAULT_VALUE}"]`)
    ).toBeVisible();
    await defaultRow
      .locator(`[data-test-subj="${AGENT_BINARY_SOURCES_TABLE_ACTIONS.EDIT}"]`)
      .click();
    await page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.NAME_INPUT).clear();
    await page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.NAME_INPUT).fill('New Name');
    await page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.HOST_INPUT).clear();
    await page.testSubj
      .locator(AGENT_BINARY_SOURCES_FLYOUT.HOST_INPUT)
      .fill('https://edited-default-host.co');
    await page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.SUBMIT_BUTTON).click();
    await page.testSubj.locator(CONFIRM_MODAL.CONFIRM_BUTTON).click();
  });

  test('allows to create new download source objects', async ({ page }) => {
    await page.gotoApp('fleet');
    await page.testSubj.locator(SETTINGS_TAB).click();

    await page.testSubj.locator(AGENT_BINARY_SOURCES_TABLE_ACTIONS.ADD).click();
    await page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.NAME_INPUT).clear();
    await page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.NAME_INPUT).fill('New Host');
    await page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.HOST_INPUT).clear();
    await page.testSubj
      .locator(AGENT_BINARY_SOURCES_FLYOUT.HOST_INPUT)
      .fill('https://new-test-host.co');
    await page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.SUBMIT_BUTTON).click();
    await expect(page.testSubj.locator(AGENT_BINARY_SOURCES_TABLE).locator('tr')).toHaveCount(3);

    await page.testSubj.locator(AGENT_BINARY_SOURCES_TABLE_ACTIONS.ADD).click();
    await page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.NAME_INPUT).clear();
    await page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.NAME_INPUT).fill('New Default Host');
    await page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.HOST_INPUT).clear();
    await page.testSubj
      .locator(AGENT_BINARY_SOURCES_FLYOUT.HOST_INPUT)
      .fill('https://new-default-host.co');
    await page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.IS_DEFAULT_SWITCH).click();
    await page.testSubj.locator(AGENT_BINARY_SOURCES_FLYOUT.SUBMIT_BUTTON).click();
  });

  test('the download source is displayed in agent policy settings', async ({ page, kbnClient }) => {
    await createDownloadSource(kbnClient, {
      name: 'Custom Host',
      id: 'fleet-local-registry',
      host: 'https://new-custom-host.co',
    });
    await createAgentPolicy(kbnClient, 'Test Agent policy', {
      id: 'new-agent-policy',
      download_source_id: 'fleet-local-registry',
    });

    await page.goto('/app/fleet/policies/new-agent-policy/settings');
    await expect(page.testSubj.locator(AGENT_POLICY_FORM.DOWNLOAD_SOURCE_SELECT)).toContainText(
      'Custom Host'
    );
  });
});
