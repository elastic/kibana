/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { deleteAllConversationsFromEs } from '../../../scout_agent_builder_shared/lib/conversations_es';
import {
  setupAgentDirectAnswer,
  setupAgentDirectError,
} from '../../../scout_agent_builder_shared/lib/proxy_scenario';
import { test } from '../fixtures';

test.describe(
  'Agent Builder — conversation error handling',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient }) => {
      await deleteAllConversationsFromEs(esClient);
    });

    test('shows error message when there is an error and allows user to retry', async ({
      page,
      pageObjects,
      llmProxy,
    }) => {
      const MOCKED_INPUT = 'test error message';
      const MOCKED_RESPONSE = 'This is a successful response after retry';
      const MOCKED_TITLE = 'Error Handling Test';

      await pageObjects.agentBuilder.navigateToApp();

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
        await expect(page.testSubj.locator('agentBuilderRoundResponse')).toContainText(
          MOCKED_RESPONSE
        );
      }).toPass({ timeout: 120_000 });

      await expect(async () => {
        expect(await pageObjects.agentBuilder.isErrorVisible()).toBe(false);
      }).toPass({ timeout: 60_000 });
    });

    test('shows a "not found" prompt when conversation ID does not exist', async ({
      page,
      pageObjects,
    }) => {
      const INVALID_ID = 'this-id-does-not-exist-12345';
      const initialUrl = page.url();

      await pageObjects.agentBuilder.navigateToApp(
        `agents/${agentBuilderDefaultAgentId}/conversations/${INVALID_ID}`
      );

      await expect(page.testSubj.locator('errorPrompt')).toBeVisible();
      await expect(page.testSubj.locator('errorPromptTitle')).toHaveText('Conversation not found');

      await expect(page.testSubj.locator('startNewConversationButton')).toBeVisible();
      await page.testSubj.click('startNewConversationButton');

      await expect(async () => {
        const newUrl = page.url();
        expect(newUrl).not.toStrictEqual(initialUrl);
        expect(newUrl).toContain('conversations/new');
      }).toPass({ timeout: 60_000 });

      await expect(page.testSubj.locator('agentBuilderWelcomePage')).toBeVisible();
    });

    test('can start a new conversation when there is an error', async ({
      page,
      pageObjects,
      llmProxy,
    }) => {
      const MOCKED_INPUT = 'test error message for new conversation';
      const MOCKED_RESPONSE = 'This is a successful response in new conversation';
      const MOCKED_TITLE = 'New Conversation After Error';

      await pageObjects.agentBuilder.navigateToApp();

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

      await pageObjects.agentBuilder.clickNewConversationButton();

      await expect(page.testSubj.locator('agentBuilderWelcomePage')).toBeVisible({
        timeout: 60_000,
      });

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

    test('an error does not persist across conversations', async ({
      page,
      pageObjects,
      llmProxy,
    }) => {
      const SUCCESSFUL_INPUT = 'successful conversation message';
      const SUCCESSFUL_RESPONSE = 'This is a successful response';
      const SUCCESSFUL_TITLE = 'Successful Conversation';
      const ERROR_INPUT = 'error conversation message';

      const successfulConversationId = await pageObjects.agentBuilder.createConversationViaUI(
        SUCCESSFUL_TITLE,
        SUCCESSFUL_INPUT,
        SUCCESSFUL_RESPONSE,
        llmProxy
      );

      await pageObjects.agentBuilder.clickNewConversationButton();
      await expect(page.testSubj.locator('agentBuilderWelcomePage')).toBeVisible({
        timeout: 60_000,
      });

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

      await expect(page.testSubj.locator('agentBuilderRoundError')).toBeVisible();
      await expect(page.testSubj.locator('agentBuilderRoundErrorRetryButton')).toBeVisible();

      await pageObjects.agentBuilder.navigateToConversationViaHistory(successfulConversationId);

      await expect(async () => {
        expect(await pageObjects.agentBuilder.isErrorVisible()).toBe(false);
      }).toPass({ timeout: 60_000 });

      await expect(async () => {
        await expect(page.testSubj.locator('agentBuilderRoundResponse')).toContainText(
          SUCCESSFUL_RESPONSE
        );
      }).toPass({ timeout: 120_000 });
    });

    test('clears the error when the user sends a new message', async ({
      page,
      pageObjects,
      llmProxy,
    }) => {
      const ERROR_INPUT = 'error message';
      const NEW_INPUT = 'new message after error';
      const NEW_RESPONSE = 'This is a successful response after error';
      const MOCKED_TITLE = 'Error Cleared Test';

      await pageObjects.agentBuilder.navigateToApp();

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

      await expect(page.testSubj.locator('agentBuilderRoundError')).toBeVisible();
      await expect(page.testSubj.locator('agentBuilderRoundErrorRetryButton')).toBeVisible();

      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: MOCKED_TITLE,
        response: NEW_RESPONSE,
      });

      await pageObjects.agentBuilder.typeMessage(NEW_INPUT);
      await pageObjects.agentBuilder.sendMessage();
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      await expect(page.testSubj.locator('agentBuilderRoundResponse')).toBeVisible({
        timeout: 120_000,
      });

      await expect(async () => {
        expect(await pageObjects.agentBuilder.isErrorVisible()).toBe(false);
      }).toPass({ timeout: 60_000 });
    });

    test('keeps the previous conversation rounds visible when there is an error', async ({
      page,
      pageObjects,
      llmProxy,
    }) => {
      const FIRST_INPUT = 'first successful message';
      const FIRST_RESPONSE = 'This is the first successful response';
      const FIRST_TITLE = 'Previous Rounds Test';
      const ERROR_INPUT = 'error message';

      await pageObjects.agentBuilder.createConversationViaUI(
        FIRST_TITLE,
        FIRST_INPUT,
        FIRST_RESPONSE,
        llmProxy
      );

      await expect(
        page.locator('[data-test-subj="agentBuilderRoundResponse"]', { hasText: FIRST_RESPONSE })
      ).toContainText(FIRST_RESPONSE);

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

      await expect(page.testSubj.locator('agentBuilderRoundError')).toBeVisible();
      await expect(page.testSubj.locator('agentBuilderRoundErrorRetryButton')).toBeVisible();

      await expect(
        page.locator('[data-test-subj="agentBuilderRoundResponse"]', { hasText: FIRST_RESPONSE })
      ).toContainText(FIRST_RESPONSE);
    });
  }
);
