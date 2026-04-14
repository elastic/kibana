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

const CONVERSATION_DATA = [
  {
    title: 'Sidebar History Conversation 1',
    userMessage: 'Hello, this is sidebar conversation 1',
    expectedResponse: 'Sidebar response for conversation 1',
  },
  {
    title: 'Sidebar History Conversation 2',
    userMessage: 'Hello, this is sidebar conversation 2',
    expectedResponse: 'Sidebar response for conversation 2',
  },
] as const;

test.describe(
  'Agent Builder — sidebar conversation history',
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

    test('embeddable sidebar conversation history', async ({ page, pageObjects }) => {
      const conversationIds: string[] = [];

      await test.step('seed conversations via full-screen UI', async () => {
        for (const conv of CONVERSATION_DATA) {
          const conversationId = await pageObjects.agentBuilder.createConversationViaUI(
            conv.title,
            conv.userMessage,
            conv.expectedResponse,
            llmProxy
          );
          conversationIds.push(conversationId);
        }
      });

      await test.step('shows existing conversations in the menu', async () => {
        await pageObjects.agentBuilder.prepareEmbeddableSidebar();
        await pageObjects.agentBuilder.openEmbeddableMenu();
        await expect(async () => {
          await expect(
            page.testSubj.locator(`agentBuilderEmbeddableConversation-${conversationIds[0]}`)
          ).toBeVisible();
          await expect(
            page.testSubj.locator(`agentBuilderEmbeddableConversation-${conversationIds[1]}`)
          ).toBeVisible();
        }).toPass({ timeout: 120_000 });
        await pageObjects.agentBuilder.dismissWithEscape();
      });

      await test.step('can switch to an existing conversation and see its messages', async () => {
        await pageObjects.agentBuilder.prepareEmbeddableSidebar();
        await pageObjects.agentBuilder.openEmbeddableMenu();
        await pageObjects.agentBuilder.selectEmbeddableConversation(conversationIds[0]);
        await expect(async () => {
          await expect(page.testSubj.locator('agentBuilderRoundResponse')).toContainText(
            CONVERSATION_DATA[0].expectedResponse
          );
        }).toPass({ timeout: 120_000 });

        await pageObjects.agentBuilder.openEmbeddableMenu();
        await pageObjects.agentBuilder.selectEmbeddableConversation(conversationIds[1]);
        await expect(async () => {
          await expect(page.testSubj.locator('agentBuilderRoundResponse')).toContainText(
            CONVERSATION_DATA[1].expectedResponse
          );
        }).toPass({ timeout: 120_000 });
      });

      await test.step('search filters the conversation list', async () => {
        await pageObjects.agentBuilder.prepareEmbeddableSidebar();
        await pageObjects.agentBuilder.openEmbeddableMenu();
        await pageObjects.agentBuilder.fillEmbeddableConversationSearch('Conversation 1');
        await expect(async () => {
          await expect(
            page.testSubj.locator(`agentBuilderEmbeddableConversation-${conversationIds[0]}`)
          ).toBeVisible();
        }).toPass({ timeout: 60_000 });
        await expect(
          page.testSubj.locator(`agentBuilderEmbeddableConversation-${conversationIds[1]}`)
        ).toBeHidden();

        await pageObjects.agentBuilder.clearEmbeddableConversationSearch();
        await expect(async () => {
          await expect(
            page.testSubj.locator(`agentBuilderEmbeddableConversation-${conversationIds[0]}`)
          ).toBeVisible();
          await expect(
            page.testSubj.locator(`agentBuilderEmbeddableConversation-${conversationIds[1]}`)
          ).toBeVisible();
        }).toPass({ timeout: 60_000 });
        await pageObjects.agentBuilder.dismissWithEscape();
      });
    });
  }
);
