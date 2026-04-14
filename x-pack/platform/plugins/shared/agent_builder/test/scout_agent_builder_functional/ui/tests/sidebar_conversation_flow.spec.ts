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
  createGenAiConnectorForProxy,
  deleteAllConnectors,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentDirectAnswer } from '../../../scout_agent_builder_shared/lib/proxy_scenario';
import { test, testData } from '../fixtures';

test.describe(
  'Agent Builder — sidebar conversation flow',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let llmProxy: LlmProxy;

    test.beforeAll(async ({ log, kbnClient }) => {
      llmProxy = await createLlmProxy(log);
      await deleteAllConnectors(kbnClient);
      await createGenAiConnectorForProxy(kbnClient, llmProxy);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient, esClient }) => {
      llmProxy.close();
      await deleteAllConnectors(kbnClient);
      await esClient.deleteByQuery({
        index: testData.CHAT_CONVERSATIONS_INDEX,
        query: { match_all: {} },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    });

    test('embeddable sidebar conversation flow', async ({ page, pageObjects }) => {
      await test.step('shows initial state', async () => {
        await pageObjects.agentBuilder.prepareEmbeddableSidebar();
        await expect(page.testSubj.locator('agentBuilderEmbeddableMenuButton')).toBeVisible();
        await expect(page.testSubj.locator('agentBuilderConversationInputForm')).toBeVisible();
      });

      await test.step('sends a message and receives a response', async () => {
        const MOCKED_INPUT = 'hello from the sidebar';
        const MOCKED_RESPONSE = 'This is the sidebar response';
        const MOCKED_TITLE = 'Sidebar Flow Test';

        await pageObjects.agentBuilder.prepareEmbeddableSidebarWithNewChat();
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
      });

      await test.step('can start a new chat from the menu', async () => {
        await pageObjects.agentBuilder.prepareEmbeddableSidebar();
        await pageObjects.agentBuilder.openEmbeddableMenu();
        await pageObjects.agentBuilder.clickEmbeddableNewChatButton();
        await expect(page.testSubj.locator('agentBuilderConversationInputForm')).toBeVisible();
        await expect(page.testSubj.locator('agentBuilderRoundResponse')).toHaveCount(0);
      });

      await test.step('can send a message after starting a new conversation from the menu', async () => {
        const MOCKED_INPUT = 'message after new chat';
        const MOCKED_RESPONSE = 'Response after new chat';
        const MOCKED_TITLE = 'Post New Chat Conversation';

        await pageObjects.agentBuilder.prepareEmbeddableSidebarWithNewChat();
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
      });
    });
  }
);
