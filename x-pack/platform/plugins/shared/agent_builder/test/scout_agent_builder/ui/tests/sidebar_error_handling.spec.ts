/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { deleteAllConversationsFromEs } from '../../../scout_agent_builder_shared/lib/conversations_es';
import {
  setupAgentDirectAnswer,
  setupAgentDirectError,
} from '../../../scout_agent_builder_shared/lib/proxy_scenario';
import { test } from '../fixtures';

test.describe(
  'Agent Builder — sidebar error handling',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient }) => {
      await deleteAllConversationsFromEs(esClient);
    });

    test('embeddable sidebar error handling', async ({ page, pageObjects, llmProxy }) => {
      test.setTimeout(180_000);

      await test.step('shows an error message and allows the user to retry', async () => {
        const MOCKED_INPUT = 'sidebar error test message';
        const MOCKED_RESPONSE = 'Successful response after retry';
        const MOCKED_TITLE = 'Sidebar Error Retry Test';

        await pageObjects.agentBuilder.prepareEmbeddableSidebarWithNewChat();
        await setupAgentDirectError({
          proxy: llmProxy,
          error: { type: 'error', statusCode: 400, errorMsg: 'Some test error' },
        });
        await pageObjects.agentBuilder.typeMessage(MOCKED_INPUT);
        await pageObjects.agentBuilder.sendMessage();
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        await expect(async () => {
          expect(await pageObjects.agentBuilder.isErrorVisible()).toBe(true);
        }).toPass({ timeout: 60_000 });
        await expect(page.testSubj.locator('agentBuilderRoundError')).toBeVisible();
        await expect(page.testSubj.locator('agentBuilderRoundErrorRetryButton')).toBeVisible();

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: MOCKED_TITLE,
          response: MOCKED_RESPONSE,
        });
        await pageObjects.agentBuilder.clickRetryButton();
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        await expect(async () => {
          await expect(
            page.locator('[data-test-subj="agentBuilderRoundResponse"]', {
              hasText: MOCKED_RESPONSE,
            })
          ).toContainText(MOCKED_RESPONSE);
        }).toPass({ timeout: 120_000 });
        await expect(async () => {
          expect(await pageObjects.agentBuilder.isErrorVisible()).toBe(false);
        }).toPass({ timeout: 60_000 });
      });

      await test.step('can start a new chat when there is an error', async () => {
        const MOCKED_INPUT = 'sidebar error before new chat';
        const MOCKED_RESPONSE = 'Successful response in new chat';
        const MOCKED_TITLE = 'Sidebar New Chat After Error';

        await pageObjects.agentBuilder.prepareEmbeddableSidebarWithNewChat();
        await setupAgentDirectError({
          proxy: llmProxy,
          error: { type: 'error', statusCode: 400, errorMsg: 'Some test error' },
        });
        await pageObjects.agentBuilder.typeMessage(MOCKED_INPUT);
        await pageObjects.agentBuilder.sendMessage();
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        await expect(async () => {
          expect(await pageObjects.agentBuilder.isErrorVisible()).toBe(true);
        }).toPass({ timeout: 60_000 });

        await pageObjects.agentBuilder.openEmbeddableMenu();
        await pageObjects.agentBuilder.clickEmbeddableNewChatButton();

        await expect(async () => {
          expect(await pageObjects.agentBuilder.isErrorVisible()).toBe(false);
        }).toPass({ timeout: 60_000 });
        await expect(page.testSubj.locator('agentBuilderConversationInputForm')).toBeVisible();

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: MOCKED_TITLE,
          response: MOCKED_RESPONSE,
        });
        await pageObjects.agentBuilder.typeMessage(MOCKED_INPUT);
        await pageObjects.agentBuilder.sendMessage();
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        await expect(async () => {
          await expect(
            page.locator('[data-test-subj="agentBuilderRoundResponse"]', {
              hasText: MOCKED_RESPONSE,
            })
          ).toContainText(MOCKED_RESPONSE);
        }).toPass({ timeout: 120_000 });
      });

      await test.step('an error does not persist when switching to another conversation', async () => {
        const SUCCESSFUL_INPUT = 'successful sidebar message';
        const SUCCESSFUL_RESPONSE = 'Successful sidebar response';
        const SUCCESSFUL_TITLE = 'Successful Sidebar Conversation';
        const ERROR_INPUT = 'error message in sidebar';

        const successfulConversationId = await pageObjects.agentBuilder.createConversationViaUI(
          SUCCESSFUL_TITLE,
          SUCCESSFUL_INPUT,
          SUCCESSFUL_RESPONSE,
          llmProxy
        );

        await pageObjects.agentBuilder.prepareEmbeddableSidebarWithNewChat();
        await expect(async () => {
          expect(await pageObjects.agentBuilder.isErrorVisible()).toBe(false);
        }).toPass({ timeout: 60_000 });

        await setupAgentDirectError({
          proxy: llmProxy,
          error: { type: 'error', statusCode: 400, errorMsg: 'Some test error' },
        });
        await pageObjects.agentBuilder.typeMessage(ERROR_INPUT);
        await pageObjects.agentBuilder.sendMessage();
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        await expect(async () => {
          expect(await pageObjects.agentBuilder.isErrorVisible()).toBe(true);
        }).toPass({ timeout: 60_000 });
        await expect(page.testSubj.locator('agentBuilderRoundErrorRetryButton')).toBeVisible();

        await pageObjects.agentBuilder.openEmbeddableMenu();
        await pageObjects.agentBuilder.selectEmbeddableConversation(successfulConversationId);

        await expect(async () => {
          expect(await pageObjects.agentBuilder.isErrorVisible()).toBe(false);
        }).toPass({ timeout: 60_000 });
        await expect(async () => {
          await expect(
            page.locator('[data-test-subj="agentBuilderRoundResponse"]', {
              hasText: SUCCESSFUL_RESPONSE,
            })
          ).toContainText(SUCCESSFUL_RESPONSE);
        }).toPass({ timeout: 120_000 });
      });

      await test.step('keeps previous conversation rounds visible when there is an error', async () => {
        const FIRST_INPUT = 'first successful sidebar message';
        const FIRST_RESPONSE = 'First successful sidebar response';
        const FIRST_TITLE = 'Previous Rounds Sidebar Test';
        const ERROR_INPUT = 'error message after success';

        const firstConversationId = await pageObjects.agentBuilder.createConversationViaUI(
          FIRST_TITLE,
          FIRST_INPUT,
          FIRST_RESPONSE,
          llmProxy
        );

        await pageObjects.agentBuilder.prepareEmbeddableSidebar();
        await pageObjects.agentBuilder.openEmbeddableMenu();
        await pageObjects.agentBuilder.selectEmbeddableConversation(firstConversationId);

        await expect(async () => {
          await expect(
            page.locator('[data-test-subj="agentBuilderRoundResponse"]', {
              hasText: FIRST_RESPONSE,
            })
          ).toContainText(FIRST_RESPONSE);
        }).toPass({ timeout: 120_000 });

        await setupAgentDirectError({
          proxy: llmProxy,
          continueConversation: true,
          error: { type: 'error', statusCode: 400, errorMsg: 'Some test error' },
        });
        await pageObjects.agentBuilder.typeMessage(ERROR_INPUT);
        await pageObjects.agentBuilder.sendMessage();
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        await expect(async () => {
          expect(await pageObjects.agentBuilder.isErrorVisible()).toBe(true);
        }).toPass({ timeout: 60_000 });
        await expect(page.testSubj.locator('agentBuilderRoundErrorRetryButton')).toBeVisible();
        await expect(async () => {
          await expect(
            page.locator('[data-test-subj="agentBuilderRoundResponse"]', {
              hasText: FIRST_RESPONSE,
            })
          ).toContainText(FIRST_RESPONSE);
        }).toPass({ timeout: 60_000 });
      });
    });
  }
);
