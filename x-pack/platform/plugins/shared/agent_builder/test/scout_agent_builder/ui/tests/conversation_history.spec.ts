/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { deleteAllConversationsFromEs } from '../../../scout_agent_builder_shared/lib/conversations_es';
import { test } from '../fixtures';

const CONVERSATION_DATA = [
  {
    title: 'Conversation1',
    userMessage: 'Hello, this is conversation 1',
    expectedResponse: 'This is the response for conversation 1',
  },
  {
    title: 'Conversation2',
    userMessage: 'Hello, this is conversation 2',
    expectedResponse: 'This is the response for conversation 2',
  },
  {
    title: 'Conversation3',
    userMessage: 'Hello, this is conversation 3',
    expectedResponse: 'This is the response for conversation 3',
  },
];

test.describe('Agent Builder — conversation history', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ esClient }) => {
    await deleteAllConversationsFromEs(esClient);
  });

  test('conversation history flows', async ({ page, pageObjects, llmProxy }) => {
    test.setTimeout(180_000);
    const conversationIds: string[] = [];

    await test.step('create three conversations', async () => {
      for (const conv of CONVERSATION_DATA) {
        const id = await pageObjects.agentBuilder.createConversationViaUI(
          conv.title,
          conv.userMessage,
          conv.expectedResponse,
          llmProxy
        );
        conversationIds.push(id);
      }
    });

    await test.step('navigate via sidebar', async () => {
      await pageObjects.agentBuilder.navigateToApp();
      await expect(async () => {
        expect(await pageObjects.agentBuilder.isConversationInHistory(conversationIds[0])).toBe(
          true
        );
        expect(await pageObjects.agentBuilder.isConversationInHistory(conversationIds[1])).toBe(
          true
        );
        expect(await pageObjects.agentBuilder.isConversationInHistory(conversationIds[2])).toBe(
          true
        );
      }).toPass({ timeout: 30_000 });
      for (let i = 0; i < CONVERSATION_DATA.length; i++) {
        const conv = CONVERSATION_DATA[i];
        const convId = conversationIds[i];
        await pageObjects.agentBuilder.navigateToConversationViaHistory(convId);
        await expect(
          page.locator('[data-test-subj="agentBuilderRoundResponse"]', {
            hasText: conv.expectedResponse,
          })
        ).toContainText(conv.expectedResponse);
      }
    });

    await test.step('navigate via URL', async () => {
      for (let i = 0; i < CONVERSATION_DATA.length; i++) {
        const conv = CONVERSATION_DATA[i];
        const convId = conversationIds[i];
        await pageObjects.agentBuilder.navigateToConversationById(convId);
        await expect(
          page.locator('[data-test-subj="agentBuilderRoundResponse"]', {
            hasText: conv.expectedResponse,
          })
        ).toContainText(conv.expectedResponse);
      }
    });

    await test.step('continue conversation', async () => {
      const MOCKED_INPUT = 'User message continuing conversation';
      const MOCKED_RESPONSE = 'LLM response continuing the conversation';
      await pageObjects.agentBuilder.navigateToConversationViaHistory(conversationIds[1]);
      await pageObjects.agentBuilder.continueConversation(MOCKED_INPUT, MOCKED_RESPONSE, llmProxy);
    });

    await test.step('delete conversation', async () => {
      const conversationIdToDelete = conversationIds[0];
      await pageObjects.agentBuilder.deleteConversation(conversationIdToDelete);
      await expect(async () => {
        expect(await pageObjects.agentBuilder.isConversationInHistory(conversationIdToDelete)).toBe(
          false
        );
      }).toPass({ timeout: 120_000 });
      expect(await pageObjects.agentBuilder.isConversationInHistory(conversationIds[1])).toBe(true);
      expect(await pageObjects.agentBuilder.isConversationInHistory(conversationIds[2])).toBe(true);
    });

    await test.step('rename conversation', async () => {
      const newTitle = 'Renamed Conversation Title';
      await pageObjects.agentBuilder.navigateToConversationViaHistory(conversationIds[1]);
      const updatedTitle = await pageObjects.agentBuilder.renameConversation(newTitle);
      expect(updatedTitle).toBe(newTitle);
    });
  });
});
