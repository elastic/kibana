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
import { test, testData } from '../fixtures';

test.describe(
  'Agent Builder — conversation flow',
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

    test('navigates to new conversation page and shows initial state', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.agentBuilder.navigateToApp();
      await expect(page.testSubj.locator('agentBuilderWelcomePage')).toBeVisible();
      await expect(page.testSubj.locator('agentBuilderConversationInputForm')).toBeVisible();
      await expect(async () => {
        const text = await page.testSubj.locator('agentBuilderAgentSelectorButton').innerText();
        expect(text).toContain('Elastic AI Agent');
      }).toPass({ timeout: 60_000 });
    });

    test('sends a message with tool call and receives response with thinking', async ({
      page,
      pageObjects,
    }) => {
      const MOCKED_INPUT = 'search for test data';
      const MOCKED_RESPONSE = 'I found test data using the search tool';
      const MOCKED_TITLE = 'Test Search Conversation';

      const conversationId = await pageObjects.agentBuilder.createConversationViaUI(
        MOCKED_TITLE,
        MOCKED_INPUT,
        MOCKED_RESPONSE,
        llmProxy,
        true
      );

      await expect(async () => {
        await expect(page.testSubj.locator('agentBuilderRoundResponse')).toContainText(
          MOCKED_RESPONSE
        );
        await expect(page.testSubj.locator('agentBuilderConversationTitleButton')).toContainText(
          MOCKED_TITLE
        );
        await expect(
          page.testSubj.locator(`agentBuilderSidebarConversation-${conversationId}`)
        ).toContainText(MOCKED_TITLE);
      }).toPass({ timeout: 120_000 });

      await pageObjects.agentBuilder.clickThinkingToggle();
      await expect(async () => {
        const thinking = await pageObjects.agentBuilder.getThinkingDetails();
        expect(thinking).toContain('Calling tool platform.core.search');
      }).toPass({ timeout: 60_000 });

      await pageObjects.agentBuilder.clickNewConversationButton();
      await expect(async () => {
        expect(await pageObjects.agentBuilder.isConversationInHistory(conversationId)).toBe(true);
        await expect(page.testSubj.locator('agentBuilderWelcomePage')).toBeVisible();
      }).toPass({ timeout: 60_000 });
    });
  }
);
