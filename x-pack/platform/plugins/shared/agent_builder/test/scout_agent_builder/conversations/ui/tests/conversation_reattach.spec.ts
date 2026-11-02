/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const SEED_MESSAGE = 'Hello, this is the seed message';
const SEED_RESPONSE = 'This is the seed response';
const QUESTION = 'Take your time answering this one';
const ANSWER = 'Here is the answer after the reload';
const TEST_TIMEOUT_MS = 180_000;
const RUN_TIMEOUT_MS = 60_000;

test.describe(
  'Agent Builder — re-attach to a running execution',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('a reload mid-run shows the running turn, lets the user stop it, and settles when it ends', async ({
      page,
      pageObjects,
      llmProxy,
    }) => {
      test.setTimeout(TEST_TIMEOUT_MS);

      await test.step('seed a conversation', async () => {
        await pageObjects.agentBuilder.createConversationViaUI(
          'Re-attach test',
          SEED_MESSAGE,
          SEED_RESPONSE,
          llmProxy
        );
      });

      // Hold the LLM call open so the run is still going when the page reloads.
      const answer = llmProxy.intercept({
        name: 'held-answer',
        when: (body) => JSON.stringify(body.messages).includes(QUESTION),
        responseMock: ANSWER,
      });

      await test.step('send a message and wait for the run to reach the LLM', async () => {
        await pageObjects.agentBuilder.typeMessage(QUESTION);
        await pageObjects.agentBuilder.sendMessage();
        await answer.waitForIntercept();
      });

      await test.step('reload and re-attach', async () => {
        await page.reload();
        // The saved conversation carries the message and the running execution; the view attaches
        // and shows the run as in progress: Stop is offered because this user started the run.
        await expect(page.getByText(QUESTION)).toBeVisible({ timeout: RUN_TIMEOUT_MS });
        await expect(
          page.testSubj.locator('agentBuilderConversationInputCancelButton')
        ).toBeVisible({ timeout: RUN_TIMEOUT_MS });
      });

      await test.step('the run finishes and the turn settles', async () => {
        await answer.completeAfterIntercept();
        await expect(
          page.locator('[data-test-subj="agentBuilderResponseMessage"]', { hasText: ANSWER })
        ).toContainText(ANSWER, { timeout: RUN_TIMEOUT_MS });
        await expect(
          page.testSubj.locator('agentBuilderConversationInputCancelButton')
        ).toBeHidden();
        await expect(
          page.testSubj.locator('agentBuilderConversationInputSubmitButton')
        ).toBeVisible();
      });
    });
  }
);
