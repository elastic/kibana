/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS } from '../../common/scout_parallel_ui_tags';
import { waitForAtLeastOneAgentOnline } from '../helpers/fleet_agents';
import { waitForLiveQueryComplete } from '../helpers/poll_live_query_history';

test.describe('Live query ECS mapping', { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS }, () => {
  test.beforeEach(async ({ browserAuth, kbnClient, pageObjects }) => {
    await waitForAtLeastOneAgentOnline(kbnClient);
    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osqueryNavigation.gotoNewLiveQuery();
    await pageObjects.osqueryLiveQueryForm.selectAllAgents();
  });

  // One submit: dynamic column map + static literal map (both columns in one response).
  test('submits a query with dynamic + static ECS mappings and surfaces both columns in results', async ({
    kbnClient,
    page,
    pageObjects,
  }) => {
    // 6 min: ECS comboboxes + agent submit + grid headers.
    test.setTimeout(360_000);

    // uptime exposes `days` for dynamic map; static map is column-agnostic.
    await pageObjects.osqueryLiveQueryForm.clearAndInputQuery('select * from uptime;');
    await pageObjects.osqueryLiveQueryForm.clickAdvanced();

    await test.step('add dynamic ECS pairing (message ← days)', async () => {
      await pageObjects.osqueryEcsMappingEditor.typeEcsField('message{downArrow}{enter}');
      await pageObjects.osqueryEcsMappingEditor.typeColumnValue('days{downArrow}{enter}');
    });

    await test.step('add static ECS value (tags = "scout-static-tag") on a second row', async () => {
      await pageObjects.osqueryEcsMappingEditor.typeEcsField('tags{downArrow}{enter}', 1);
      // eslint-disable-next-line playwright/no-nth-methods -- row 1 static value combo
      const staticInput = page.testSubj.locator('osqueryColumnValueSelect').nth(1);
      await staticInput.getByTestId('comboBoxSearchInput').click();
      await staticInput.getByTestId('comboBoxSearchInput').fill('scout-static-tag');
      await page.keyboard.press('Enter');
    });

    await test.step('submit and assert both mapped columns render', async () => {
      const actionId = await pageObjects.osqueryLiveQueryForm.submitQuery();
      if (actionId) {
        await waitForLiveQueryComplete(kbnClient, actionId);
      }

      await pageObjects.osqueryLiveQueryForm.waitForSingleQueryResults();
      // Headers prove dynamic (message) + static (tags) mappings landed in results.
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

    // Editor adds trailing empty row after first complete row — delete first row, expect one left.
    await pageObjects.osqueryEcsMappingEditor.typeEcsField('message{downArrow}{enter}');
    await pageObjects.osqueryEcsMappingEditor.typeColumnValue('days{downArrow}{enter}');

    const rows = pageObjects.osqueryEcsMappingEditor.mappingForm;
    await expect(rows).toHaveCount(2, { timeout: 10_000 });

    // eslint-disable-next-line playwright/no-nth-methods -- delete first populated row
    await page.getByLabel('Delete ECS mapping row').first().click();
    await expect(rows).toHaveCount(1, { timeout: 10_000 });

    // Submit stays enabled with no mappings (optional).
    await expect(pageObjects.osqueryLiveQueryForm.submitButton).toBeEnabled();
  });
});
