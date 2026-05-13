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

const SAVED_QUERY_BODY = 'select * from uptime;';

test.describe(
  'Live query saved-query dropdown',
  { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS },
  () => {
    let savedQueryId: string;
    let savedObjectId: string;

    test.beforeAll(async ({ apiServices }) => {
      const body = {
        id: `scout-dropdown-${Date.now()}`,
        description: 'Scout dropdown test',
        query: SAVED_QUERY_BODY,
        interval: '3600',
        ecs_mapping: {},
      };

      const created = await apiServices.osquery.savedQueries.create(body);
      const inner = (created.data as { data: { saved_object_id: string; id: string } }).data;
      savedObjectId = inner.saved_object_id;
      savedQueryId = inner.id;
    });

    test.afterAll(async ({ apiServices }) => {
      if (savedObjectId) {
        await apiServices.osquery.savedQueries.delete(savedObjectId);
      }
    });

    // One flow: dropdown → Monaco → submit (does not assert Monaco overwrite edge case).
    test('populates the editor from the saved-query dropdown and submits against the mocked agent', async ({
      browserAuth,
      esClient,
      page,
      pageObjects,
    }) => {
      // 3 min: dropdown + seed + submit + results.
      test.setTimeout(180_000);

      const { agents } = await mockFleetAgents(page, { count: 1 });

      await browserAuth.loginAsOsqueryPowerUser();
      await pageObjects.osqueryNavigation.gotoNewLiveQuery();

      await test.step('selects the saved query from the dropdown', async () => {
        await pageObjects.osqueryLiveQueryForm.selectSavedQueryFromDropdown(savedQueryId);
        const editorText = await pageObjects.osqueryLiveQueryForm.getMonacoEditorText();
        expect(editorText).toContain(SAVED_QUERY_BODY);
      });

      await test.step('submits against the mocked agent', async () => {
        // Tier-A: specific-agent selection (NOT "All agents") avoids the
        // server-side `.fleet-agents` lookup. See `selectMockedAgents` JSDoc.
        await pageObjects.osqueryLiveQueryForm.selectMockedAgents(agents[0].hostName);
        const { queryActionIds } = await pageObjects.osqueryLiveQueryForm.submitQuery();
        const queryActionId = queryActionIds[0] ?? 'unknown';

        await indexActionResponses(esClient, {
          actionId: queryActionId,
          agents,
          rowCountPerAgent: 1,
        });
        await indexResultRows(esClient, {
          actionId: queryActionId,
          agents,
          rows: [{ total_seconds: '1000' }],
        });
      });

      await test.step('renders results', async () => {
        await pageObjects.osqueryLiveQueryForm.waitForSingleQueryResults();
        await expect(pageObjects.osqueryLiveQueryForm.resultsTable).toBeVisible({
          timeout: 60_000,
        });
      });
    });
  }
);
