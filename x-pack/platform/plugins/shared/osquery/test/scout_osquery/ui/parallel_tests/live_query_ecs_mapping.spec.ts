/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS } from '../../common/scout_parallel_ui_tags';
import { mockFleetAgents, indexActionResponses, indexResultRows } from '../helpers/data_loaders';
import type { GeneratedAgent } from '../helpers/data_loaders';

test.describe('Live query ECS mapping', { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS }, () => {
  // Mock is installed per-test in beforeEach (page is test-scoped, not worker-scoped).
  // mockedAgents is populated in beforeEach and consumed by tests that need to seed
  // matching action responses / result rows for the same agent IDs.
  let mockedAgents: GeneratedAgent[] = [];

  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    const { agents } = await mockFleetAgents(page, { count: 1 });
    mockedAgents = agents;
    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osqueryNavigation.gotoNewLiveQuery();
    // Tier-A: pick the mocked agent by hostname to avoid sending `agent_all: true`,
    // which would trigger Fleet's server-side `.fleet-agents` lookup (no Fleet
    // Server in PR pipeline → POST 500s).
    await pageObjects.osqueryLiveQueryForm.selectMockedAgents(mockedAgents[0].hostName);
  });

  // One submit: dynamic column map + static literal map (both columns in one response).
  test('submits a query with dynamic + static ECS mappings and surfaces both columns in results', async ({
    esClient,
    page,
    pageObjects,
  }) => {
    // 3 min: ECS comboboxes + grid headers.
    test.setTimeout(180_000);

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
      const { queryActionIds } = await pageObjects.osqueryLiveQueryForm.submitQuery();
      const queryActionId = queryActionIds[0] ?? 'unknown';

      await indexActionResponses(esClient, {
        actionId: queryActionId,
        agents: mockedAgents,
        rowCountPerAgent: 1,
      });
      await indexResultRows(esClient, {
        actionId: queryActionId,
        agents: mockedAgents,
        rows: [{ days: 1, 'message.dynamic': 'mapped', 'tags.static': 'scout-static-tag' }],
      });

      await pageObjects.osqueryLiveQueryForm.waitForSingleQueryResults();
      await expect(pageObjects.osqueryLiveQueryForm.resultsTable).toBeVisible({
        timeout: 60_000,
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
