/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { waitForAtLeastOneAgentOnline } from '../helpers/fleet_agents';

const localTags = ['@local-stateful-classic', '@local-serverless-security_complete'];

test.describe('Live query ECS mapping', { tag: localTags }, () => {
  test.beforeEach(async ({ browserAuth, kbnClient, pageObjects }) => {
    await waitForAtLeastOneAgentOnline(kbnClient);
    await browserAuth.loginAsAdmin();
    await pageObjects.osqueryNavigation.gotoNewLiveQuery();
    await pageObjects.osqueryLiveQueryForm.selectAllAgents();
  });

  // One submission covers both mapping variants end-to-end. A dynamic pairing
  // (ECS field ← osquery column) and a static mapping (ECS field = literal) are
  // both in effect on the same submit, so both columns appear in the single
  // response — cutting the agent-submit budget for this file in half without
  // losing either assertion.
  test('submits a query with dynamic + static ECS mappings and surfaces both columns in results', async ({
    page,
    pageObjects,
  }) => {
    test.setTimeout(360_000);

    await pageObjects.osqueryLiveQueryForm.clearAndInputQuery('select * from processes;');
    await pageObjects.osqueryLiveQueryForm.clickAdvanced();

    await test.step('add dynamic ECS pairing (message ← days)', async () => {
      await pageObjects.osqueryEcsMappingEditor.typeEcsField('message{downArrow}{enter}');
      await pageObjects.osqueryEcsMappingEditor.typeColumnValue('days{downArrow}{enter}');
    });

    await test.step('add static ECS value (tags = "scout-static-tag") on a second row', async () => {
      await pageObjects.osqueryEcsMappingEditor.typeEcsField('tags{downArrow}{enter}', 1);
      // Static values take a free-form string on the second combo of the row;
      // Enter commits the pill, matching the Cypress `{enter}` behavior.
      // eslint-disable-next-line playwright/no-nth-methods -- second row's static-value input, paired with the second typeEcsField above
      const staticInput = page.testSubj.locator('osqueryColumnValueSelect').nth(1);
      await staticInput.getByTestId('comboBoxSearchInput').click();
      await staticInput.getByTestId('comboBoxSearchInput').fill('scout-static-tag');
      await page.keyboard.press('Enter');
    });

    await test.step('submit and assert both mapped columns render', async () => {
      await pageObjects.osqueryLiveQueryForm.submitQuery();
      await pageObjects.osqueryLiveQueryForm.waitForResults();
      // `message` appears only when the server persisted the dynamic pairing
      // AND the agent's `days` column resolved to a value. `tags` appears only
      // when the static mapping is honored in the result pipeline.
      await expect(page.testSubj.locator('dataGridHeaderCell-message')).toBeVisible({
        timeout: 180_000,
      });
      await expect(page.testSubj.locator('dataGridHeaderCell-tags')).toBeVisible({
        timeout: 180_000,
      });
    });
  });

  test('adds and removes ECS mapping rows without blocking submission', async ({
    page,
    pageObjects,
  }) => {
    test.setTimeout(120_000);

    await pageObjects.osqueryLiveQueryForm.clearAndInputQuery('select * from uptime;');
    await pageObjects.osqueryLiveQueryForm.clickAdvanced();

    // Start with one pairing row, then add a second. EcsMappingEditor auto-adds
    // an empty row after the first is completed, so after pairing row 0 we
    // assert that >= 2 rows exist, then remove row 0.
    await pageObjects.osqueryEcsMappingEditor.typeEcsField('message{downArrow}{enter}');
    await pageObjects.osqueryEcsMappingEditor.typeColumnValue('days{downArrow}{enter}');

    const rows = pageObjects.osqueryEcsMappingEditor.ecsMappingForm();
    await expect(rows).toHaveCount(2, { timeout: 10_000 });

    // eslint-disable-next-line playwright/no-nth-methods -- the form always renders a trailing empty row; removing the first (populated) row validates the delete action returns the form to a single-row state
    await page.getByLabel('Delete ECS mapping row').first().click();
    await expect(rows).toHaveCount(1, { timeout: 10_000 });

    // Removing the only pairing row should not leave the form in an invalid
    // state — submit should still be enabled, proving mapping is optional.
    await expect(pageObjects.osqueryLiveQueryForm.submitButton).toBeEnabled();
  });
});
