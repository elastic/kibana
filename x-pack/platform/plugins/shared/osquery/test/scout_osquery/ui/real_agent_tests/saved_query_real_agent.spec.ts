/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @kbn/eslint/scout_test_file_naming */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS } from '../../common/scout_parallel_ui_tags';
import { waitForAtLeastOneAgentOnline } from '../helpers/fleet_agents';
import { waitForLiveQueryComplete } from '../helpers/poll_live_query_history';

const SAVED_QUERY_BODY = 'select * from uptime;';

/**
 * Tier-B real-agent saved-query round trip.
 *
 * Creates a saved query via the API, selects it from the live-query form's
 * saved-query dropdown, submits it against the enrolled Elastic Agent, and
 * asserts a real result row renders. Complements
 * `live_query_real_agent.spec.ts` by also covering the saved-query persistence
 * path through Kibana's saved object service.
 */
test.describe(
  'Real-agent saved query round trip',
  { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS },
  () => {
    let savedQueryId: string;

    test.beforeAll(async ({ apiServices }) => {
      const id = `scout-real-saved-${Date.now()}`;
      const response = await apiServices.osquery.savedQueries.create({
        id,
        description: 'scout real-agent saved query',
        query: SAVED_QUERY_BODY,
        platform: 'linux,darwin',
        interval: '3600',
        ecs_mapping: {},
      });
      savedQueryId = (response.data as { data: { saved_object_id: string } }).data.saved_object_id;
    });

    test.afterAll(async ({ apiServices }) => {
      if (savedQueryId) {
        await apiServices.osquery.savedQueries.delete(savedQueryId);
      }
    });

    test('selects a saved query and submits it against the enrolled agent', async ({
      browserAuth,
      kbnClient,
      page,
      pageObjects,
    }) => {
      test.setTimeout(360_000);

      await waitForAtLeastOneAgentOnline(kbnClient, { expectedCount: 1, timeoutMs: 240_000 });

      await browserAuth.loginAsOsqueryPowerUser();
      await pageObjects.osqueryNavigation.gotoNewLiveQuery();

      await pageObjects.osqueryLiveQueryForm.selectSavedQueryFromDropdown(savedQueryId);
      const editorText = await pageObjects.osqueryLiveQueryForm.getMonacoEditorText();
      expect(editorText).toContain(SAVED_QUERY_BODY);

      await pageObjects.osqueryLiveQueryForm.selectAllAgents();
      const { actionId } = await pageObjects.osqueryLiveQueryForm.submitQuery();

      if (actionId) {
        await waitForLiveQueryComplete(kbnClient, actionId);
      }

      await pageObjects.osqueryLiveQueryForm.waitForSingleQueryResults();
      // eslint-disable-next-line playwright/no-nth-methods -- any real result cell
      await expect(page.testSubj.locator('dataGridRowCell').first()).toBeVisible({
        timeout: 120_000,
      });
    });
  }
);
