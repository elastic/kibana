/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createAgentViaKbn,
  deleteAgentViaKbn,
} from '../../../scout_agent_builder_shared/lib/agents_kbn';
import {
  createGenAiConnectorForProxy,
  deleteAllConnectors,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentDirectAnswer } from '../../../scout_agent_builder_shared/lib/proxy_scenario';
import { test, testData } from '../fixtures';

const CUSTOM_AGENT_ID = 'sidebar-test-agent';
const CUSTOM_AGENT_NAME = 'Sidebar Test Agent';

test.describe(
  'Agent Builder — sidebar agent switch',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let llmProxy: LlmProxy;

    test.beforeAll(async ({ log, kbnClient }) => {
      llmProxy = await createLlmProxy(log);
      await deleteAllConnectors(kbnClient);
      await createGenAiConnectorForProxy(kbnClient, llmProxy);
      try {
        await deleteAgentViaKbn(kbnClient, CUSTOM_AGENT_ID);
      } catch {
        // ignore
      }
      await createAgentViaKbn(kbnClient, {
        id: CUSTOM_AGENT_ID,
        name: CUSTOM_AGENT_NAME,
        description: 'A custom agent for sidebar switch testing',
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient, esClient }) => {
      llmProxy.close();
      await deleteAllConnectors(kbnClient);
      try {
        await deleteAgentViaKbn(kbnClient, CUSTOM_AGENT_ID);
      } catch {
        // ignore
      }
      await esClient.deleteByQuery({
        index: testData.CHAT_CONVERSATIONS_INDEX,
        query: { match_all: {} },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    });

    test('embeddable sidebar agent switch', async ({ page, pageObjects }) => {
      await test.step('starts with the default agent selected', async () => {
        await pageObjects.agentBuilder.prepareEmbeddableSidebar();
        await pageObjects.agentBuilder.openEmbeddableMenu();
        await expect(page.testSubj.locator('agentBuilderEmbeddableAgentRow')).toContainText(
          'Elastic AI Agent'
        );
        await pageObjects.agentBuilder.dismissWithEscape();
      });

      await test.step('switching agent resets to a new conversation', async () => {
        await pageObjects.agentBuilder.prepareEmbeddableSidebarWithNewChat();
        await pageObjects.agentBuilder.openEmbeddableMenu();
        await pageObjects.agentBuilder.clickEmbeddableAgentRow();
        await expect(
          page.testSubj.locator(`agentBuilderAgentOption-${CUSTOM_AGENT_ID}`)
        ).toBeVisible({ timeout: 60_000 });
        await pageObjects.agentBuilder.selectEmbeddableAgent(CUSTOM_AGENT_ID);
        await expect(
          page.testSubj.locator(`agentBuilderAgentOption-${CUSTOM_AGENT_ID}`)
        ).toHaveCount(0);
        await expect(page.testSubj.locator('agentBuilderRoundResponse')).toHaveCount(0);
        await expect(page.testSubj.locator('agentBuilderConversationInputForm')).toBeVisible();
      });

      await test.step('new conversation uses the switched agent', async () => {
        const MOCKED_INPUT = 'message with the custom agent';
        const MOCKED_RESPONSE = 'response from the custom agent';
        const MOCKED_TITLE = 'Custom Agent Conversation';

        await pageObjects.agentBuilder.prepareEmbeddableSidebarWithNewChat();
        await pageObjects.agentBuilder.openEmbeddableMenu();
        await pageObjects.agentBuilder.clickEmbeddableAgentRow();
        await expect(
          page.testSubj.locator(`agentBuilderAgentOption-${CUSTOM_AGENT_ID}`)
        ).toBeVisible({ timeout: 60_000 });
        await pageObjects.agentBuilder.selectEmbeddableAgent(CUSTOM_AGENT_ID);

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: MOCKED_TITLE,
          response: MOCKED_RESPONSE,
        });
        await pageObjects.agentBuilder.typeMessage(MOCKED_INPUT);
        await pageObjects.agentBuilder.sendMessage();
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        await expect(async () => {
          await expect(page.testSubj.locator('agentBuilderRoundResponse')).toContainText(
            MOCKED_RESPONSE
          );
        }).toPass({ timeout: 120_000 });

        await pageObjects.agentBuilder.openEmbeddableMenu();
        await expect(page.testSubj.locator('agentBuilderEmbeddableAgentRow')).toContainText(
          CUSTOM_AGENT_NAME
        );
        await pageObjects.agentBuilder.dismissWithEscape();
      });

      await test.step('can switch back to the default agent', async () => {
        await pageObjects.agentBuilder.prepareEmbeddableSidebarWithNewChat();
        await pageObjects.agentBuilder.openEmbeddableMenu();
        await pageObjects.agentBuilder.clickEmbeddableAgentRow();
        await expect(
          page.testSubj.locator(`agentBuilderAgentOption-${CUSTOM_AGENT_ID}`)
        ).toBeVisible({ timeout: 60_000 });
        await pageObjects.agentBuilder.selectEmbeddableAgent(CUSTOM_AGENT_ID);

        await pageObjects.agentBuilder.openEmbeddableMenu();
        await pageObjects.agentBuilder.clickEmbeddableAgentRow();
        await expect(
          page.testSubj.locator(`agentBuilderAgentOption-${agentBuilderDefaultAgentId}`)
        ).toBeVisible({ timeout: 60_000 });
        await pageObjects.agentBuilder.selectEmbeddableAgent(agentBuilderDefaultAgentId);
        await expect(
          page.testSubj.locator(`agentBuilderAgentOption-${agentBuilderDefaultAgentId}`)
        ).toHaveCount(0);
        await expect(async () => {
          await expect(page.testSubj.locator('agentBuilderRoundResponse')).toHaveCount(0);
        }).toPass({ timeout: 60_000 });
        await expect(page.testSubj.locator('agentBuilderConversationInputForm')).toBeVisible();
      });
    });
  }
);
