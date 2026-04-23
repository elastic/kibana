/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { uiTest as test } from '../fixtures';
import { waitForAtLeastOneAgentOnline } from '../helpers/fleet_agents';
import { waitForLiveQueryComplete } from '../helpers/poll_live_query_history';

const localTags = [...tags.stateful.classic, ...tags.serverless.security.complete];

const SAVED_QUERY_BODY = 'select * from uptime;';

test.describe('Live query saved-query dropdown', { tag: localTags }, () => {
  let savedQueryId: string;
  let savedObjectId: string;

  test.beforeAll(async ({ kbnClient, apiServices }) => {
    await waitForAtLeastOneAgentOnline(kbnClient);

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

  // Single submission covers the entire dropdown → Monaco populate → submit
  // happy path. Per design decision 7 the spec deliberately asserts nothing
  // about the known Monaco-overwrite quirk cited in `live_query_history.spec.ts`
  // — the dropdown test stays stable across the bug's lifecycle.
  test('populates the editor from the saved-query dropdown and submits against agents', async ({
    browserAuth,
    kbnClient,
    pageObjects,
  }) => {
    test.setTimeout(300_000);

    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osqueryNavigation.gotoNewLiveQuery();

    await test.step('selects the saved query from the dropdown', async () => {
      await pageObjects.osqueryLiveQueryForm.selectSavedQueryFromDropdown(savedQueryId);
      const editorText = await pageObjects.osqueryLiveQueryForm.getMonacoEditorText();
      expect(editorText).toContain(SAVED_QUERY_BODY);
    });

    await test.step('submits against all agents', async () => {
      await pageObjects.osqueryLiveQueryForm.selectAllAgents();
      const actionId = await pageObjects.osqueryLiveQueryForm.submitQuery();
      if (actionId) {
        await waitForLiveQueryComplete(kbnClient, actionId);
      }
    });

    await test.step('renders results', async () => {
      await pageObjects.osqueryLiveQueryForm.waitForResults();
      await expect(pageObjects.osqueryLiveQueryForm.resultsTable).toBeVisible({
        timeout: 180_000,
      });
    });
  });
});
