/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createAgentViaKbn,
  deleteAllAgentsFromEs,
} from '../../../scout_agent_builder_shared/lib/agents_kbn';
import {
  createGenAiConnectorForProxy,
  deleteAllConnectors,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { test, testData } from '../fixtures';

const agents = [
  { id: 'test_agent_1', name: 'Test Agent 1', labels: ['first'] as const },
  { id: 'test_agent_2', name: 'Test Agent 2', labels: ['second'] as const },
] as const;

test.describe(
  'Agent Builder — edit agent',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let llmProxy: LlmProxy;

    test.beforeAll(async ({ log, kbnClient, esClient }) => {
      llmProxy = await createLlmProxy(log);
      await deleteAllConnectors(kbnClient);
      await createGenAiConnectorForProxy(kbnClient, llmProxy);
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

    test.afterAll(async ({ kbnClient, esClient }) => {
      llmProxy.close();
      await deleteAllConnectors(kbnClient);
      await deleteAllAgentsFromEs(esClient, testData.CHAT_AGENTS_INDEX);
      await esClient.deleteByQuery({
        index: testData.CHAT_CONVERSATIONS_INDEX,
        query: { match_all: {} },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    });

    test('edit and clone agent journeys', async ({ page, pageObjects }) => {
      let agent = agents[0];

      await test.step('navigates to agent edit form', async () => {
        await pageObjects.agentBuilder.navigateToApp('manage/agents');
        await pageObjects.agentBuilder.clickAgentEdit(agent.id);
        await expect(page).toHaveURL(new RegExp(`/app/agent_builder/manage/agents/${agent.id}`));
      });

      await test.step('shows agent name as page title', async () => {
        expect(await pageObjects.agentBuilder.getAgentFormPageTitle()).toBe(agent.name);
      });

      await test.step('does not enable save until edits', async () => {
        await expect(page.testSubj.locator('agentFormSaveButton')).toBeDisabled();
      });

      await test.step('disables agent id input', async () => {
        await expect(page.testSubj.locator('agentSettingsIdInput')).toHaveValue(agent.id);
        await expect(page.testSubj.locator('agentSettingsIdInput')).toBeDisabled();
      });

      await test.step('edits agent name', async () => {
        expect(await pageObjects.agentBuilder.getAgentFormDisplayName()).toBe(agent.name);
        const editedName = 'Edited Test Agent';
        await pageObjects.agentBuilder.setAgentFormDisplayName(editedName);
        await expect(page.testSubj.locator('agentFormSaveButton')).toBeEnabled();
        await page.testSubj.click('agentFormSaveButton');
        await page.testSubj
          .locator('agentBuilderAgentsListPageTitle')
          .waitFor({ state: 'visible' });
        expect(await pageObjects.agentBuilder.getAgentRowDisplayName(agent.id)).toBe(editedName);
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
