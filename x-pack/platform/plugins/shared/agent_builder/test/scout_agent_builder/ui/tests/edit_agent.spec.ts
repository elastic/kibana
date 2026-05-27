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
import { deleteAllConversationsFromEs } from '../../../scout_agent_builder_shared/lib/conversations_es';
import { test, testData } from '../fixtures';

const agents = [
  { id: 'test_agent_1', name: 'Test Agent 1', labels: ['first'] as const },
  { id: 'test_agent_2', name: 'Test Agent 2', labels: ['second'] as const },
] as const;

type Agent = (typeof agents)[number];

test.describe(
  'Agent Builder — edit agent',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    test.beforeAll(async ({ kbnClient, esClient }) => {
      await deleteAllAgentsFromEs(esClient, testData.CHAT_AGENTS_INDEX);
      for (const agent of agents) {
        await createAgentViaKbn(kbnClient, {
          id: agent.id,
          name: agent.name,
          labels: [...agent.labels],
        });
      }
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient }) => {
      await deleteAllAgentsFromEs(esClient, testData.CHAT_AGENTS_INDEX);
      await deleteAllConversationsFromEs(esClient);
    });

    test('edit and clone agent journeys', async ({ page, pageObjects }) => {
      let agent: Agent = agents[0];

      await test.step('navigates to agent edit form', async () => {
        await pageObjects.agentBuilder.navigateToApp('manage/agents');
        await pageObjects.agentBuilder.clickAgentEdit(agent.id);
        await expect(page).toHaveURL(new RegExp(`/app/agent_builder/manage/agents/${agent.id}`));
      });

      await test.step('shows agent name as page title', async () => {
        expect(await pageObjects.agentBuilder.getAgentFormPageTitle()).toBe(agent.name);
      });

      await test.step('does not enable save until edits', async () => {
        await expect(
          page.getByTestId('agentBuilderWrapper').getByTestId('agentFormSaveButton')
        ).toBeDisabled();
      });

      await test.step('disables agent id input', async () => {
        await expect(page.testSubj.locator('agentSettingsIdInput')).toHaveValue(agent.id);
        await expect(page.testSubj.locator('agentSettingsIdInput')).toBeDisabled();
      });

      await test.step('edits agent name', async () => {
        expect(await pageObjects.agentBuilder.getAgentFormDisplayName()).toBe(agent.name);
        const editedName = 'Edited Test Agent';
        await pageObjects.agentBuilder.setAgentFormDisplayName(editedName);
        await expect(
          page.getByTestId('agentBuilderWrapper').getByTestId('agentFormSaveButton')
        ).toBeEnabled();
        await page.getByTestId('agentBuilderWrapper').getByTestId('agentFormSaveButton').click();
        await page.testSubj
          .locator('agentBuilderAgentsListPageTitle')
          .waitFor({ state: 'visible' });
        // The list page renders before React-Query's background refetch lands, so
        // the row can briefly show the previous name. Poll until the refresh hits.
        await expect(async () => {
          expect(await pageObjects.agentBuilder.getAgentRowDisplayName(agent.id)).toBe(editedName);
        }).toPass({ timeout: 30_000 });
      });

      await test.step('clones agent', async () => {
        agent = agents[1];
        await pageObjects.agentBuilder.navigateToApp('manage/agents');
        await pageObjects.agentBuilder.clickAgentClone(agent.id);
        await expect(page).toHaveURL(
          new RegExp(`/app/agent_builder/manage/agents/new\\?source_id=${agent.id}`)
        );
        expect(await pageObjects.agentBuilder.getAgentFormDisplayName()).toBe(agent.name);
        await expect(page.testSubj.locator('agentSettingsIdInput')).toHaveValue('test_agent_3');
        await expect(page.testSubj.locator('agentSettingsIdInput')).toBeEnabled();
      });
    });
  }
);
