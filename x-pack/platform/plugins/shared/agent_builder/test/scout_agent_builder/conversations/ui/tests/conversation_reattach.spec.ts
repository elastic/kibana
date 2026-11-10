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
const REPLAYED_TEXT = 'Here is the answer before the reload.';
const LIVE_TEXT = ' This text arrived after the reload.';
const ANSWER = `${REPLAYED_TEXT}${LIVE_TEXT}`;
const TEST_TIMEOUT_MS = 180_000;
const RUN_TIMEOUT_MS = 60_000;

test.describe(
  'Agent Builder — re-attach to a running execution',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('a reload mid-run replays text, shows Stop, continues streaming, and settles when it ends', async ({
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
      });
      const responseMessage = page.locator('[data-test-subj="agentBuilderResponseMessage"]', {
        hasText: REPLAYED_TEXT,
      });

      await test.step('send a message and stream partial text', async () => {
        await pageObjects.agentBuilder.typeMessage(QUESTION);
        await pageObjects.agentBuilder.sendMessage();
        const simulator = await answer.waitForIntercept();
        await simulator.writeChunk(REPLAYED_TEXT);
        await expect(responseMessage).toHaveText(REPLAYED_TEXT, { timeout: RUN_TIMEOUT_MS });
      });

      await test.step('reload and re-attach', async () => {
        await page.reload();
        await expect(page.getByText(QUESTION)).toBeVisible({ timeout: RUN_TIMEOUT_MS });
        await expect(
          page.testSubj.locator('agentBuilderConversationInputCancelButton')
        ).toBeVisible({ timeout: RUN_TIMEOUT_MS });
        await expect(responseMessage).toHaveText(REPLAYED_TEXT, { timeout: RUN_TIMEOUT_MS });
      });

      await test.step('receive live text before the run completes', async () => {
        const simulator = await answer.waitForIntercept();
        await simulator.writeChunk(LIVE_TEXT);
        await expect(responseMessage).toHaveText(ANSWER, { timeout: RUN_TIMEOUT_MS });
      });

      await test.step('the run finishes and the turn settles', async () => {
        const simulator = await answer.waitForIntercept();
        await simulator.complete();
        await expect(
          page.testSubj.locator('agentBuilderConversationInputCancelButton')
        ).toBeHidden();
        await expect(
          page.testSubj.locator('agentBuilderConversationInputSubmitButton')
        ).toBeVisible();
        await expect(responseMessage).toContainText(ANSWER, { timeout: RUN_TIMEOUT_MS });
      });
    });
  }
);
