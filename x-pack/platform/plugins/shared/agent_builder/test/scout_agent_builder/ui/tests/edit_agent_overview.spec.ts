/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createAgentViaKbn,
  deleteAllAgentsFromEs,
} from '../../../scout_agent_builder_shared/lib/agents_kbn';
import { test, testData } from '../fixtures';

const agent = { id: 'overview_edit_agent', name: 'Overview Edit Agent', labels: ['overview'] };

// Regression coverage for the overview-page "edit details" flyout. That flyout used to send the
// full access_control object (including `entries: []`) in the update body, which the update
// endpoint's schema rejects with a 400 — breaking every prompt edit from the overview page.
// This drives the real form -> http client -> PUT /agents/:id path so the regression can't
// come back unnoticed. See elastic/search-team#15698.
test.describe(
  'Agent Builder — edit agent from overview page',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    test.beforeAll(async ({ kbnClient, esClient }) => {
      await deleteAllAgentsFromEs(esClient, testData.CHAT_AGENTS_INDEX);
      await createAgentViaKbn(kbnClient, {
        id: agent.id,
        name: agent.name,
        labels: [...agent.labels],
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient }) => {
      await deleteAllAgentsFromEs(esClient, testData.CHAT_AGENTS_INDEX);
    });

    test('edits the prompt from the overview flyout without a 400', async ({
      page,
      pageObjects,
    }) => {
      const newInstructions = 'Updated instructions from the overview flyout';

      await test.step('opens the edit-details flyout', async () => {
        await pageObjects.agentBuilder.navigateToAgentOverview(agent.id);
        await pageObjects.agentBuilder.openEditDetailsFlyout();
      });

      await test.step('edits the prompt and saves', async () => {
        // Editing the prompt is enough to dirty the form and enable Save. The buggy payload lived
        // in the form's default access_control value, so any save reproduced the regression.
        await pageObjects.agentBuilder.setEditDetailsInstructions(newInstructions);

        const [response] = await Promise.all([
          page.waitForResponse(
            (res) =>
              /\/api\/agent_builder\/agents\/[^/]+$/.test(res.url()) &&
              res.request().method() === 'PUT'
          ),
          page.testSubj.click('editDetailsSaveButton'),
        ]);

        // Load-bearing assertion: this PUT returned 400 before the fix.
        expect(response.status()).toBe(200);

        // The update body must not carry access_control.entries — those go through the dedicated
        // /access_control endpoint, and the update schema rejects them.
        const requestBody = JSON.parse(response.request().postData() ?? '{}');
        expect(requestBody.access_control ?? {}).not.toHaveProperty('entries');

        // A successful save closes the flyout; an error keeps it open with an error toast.
        await expect(page.testSubj.locator('editDetailsFlyout')).toBeHidden();
      });

      await test.step('persists the edited prompt after reload', async () => {
        await pageObjects.agentBuilder.navigateToAgentOverview(agent.id);
        await pageObjects.agentBuilder.openEditDetailsFlyout();
        expect(await pageObjects.agentBuilder.getEditDetailsInstructions()).toBe(newInstructions);
      });
    });
  }
);
