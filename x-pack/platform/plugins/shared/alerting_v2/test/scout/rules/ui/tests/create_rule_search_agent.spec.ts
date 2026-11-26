/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { getPlaywrightTagsFor } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { UNIFIED_RULE_CREATION_FEATURE_FLAG } from '../../../../../common/feature_flags';
import {
  agentChatTest as test,
  buildCreateRuleData,
  mockAgentAnswer,
  mockTitleGeneration,
} from '../fixtures';

const REQUEST = 'Alert me when the CPU of any host stays above 90 percent';
// The header "Create rule" button only renders once the list has rules: the empty state shows the
// create options inline instead of in the flyout.
const existingRuleId = randomUUID();

const setUnifiedRuleCreationFlag = (
  apiServices: { core: { settings: (overrides: Record<string, unknown>) => Promise<void> } },
  enabled: boolean
) =>
  apiServices.core.settings({
    'feature_flags.overrides': { [UNIFIED_RULE_CREATION_FEATURE_FLAG]: enabled },
  });

/*
 * Unified rule creation behind its feature flag: the search input of the create rule flyout hands
 * the typed text to a new Agent Builder side chat conversation. The model is scripted through the
 * LLM proxy, the rest is real.
 */
test.describe(
  'Create rule flyout - search input',
  // Local-only: the LLM proxy binds to the runner's loopback, unreachable from a Cloud Kibana.
  {
    tag: [
      ...getPlaywrightTagsFor('stateful', 'classic', 'local'),
      ...getPlaywrightTagsFor('serverless', 'observability_complete', 'local'),
    ],
  },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      const { items, errors } = await apiServices.alertingV2.rules.bulkCreate({
        items: [
          buildCreateRuleData({
            id: existingRuleId,
            enabled: false,
            metadata: { name: `Create rule search rule ${existingRuleId}` },
          }),
        ],
      });
      expect(errors).toStrictEqual([]);
      expect(items).toHaveLength(1);
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await setUnifiedRuleCreationFlag(apiServices, true);
      await browserAuth.loginAsAdmin();
      await pageObjects.rulesList.goto();
      await expect(pageObjects.rulesList.createRuleButton).toBeVisible();
    });

    test.afterEach(async ({ apiServices }) => {
      await setUnifiedRuleCreationFlag(apiServices, false);
    });

    test.afterAll(async ({ apiServices }) => {
      const { errors } = await apiServices.alertingV2.rules.bulkDelete({ ids: [existingRuleId] });
      expect(errors.filter(({ error }) => error.code !== 'RULE_NOT_FOUND')).toStrictEqual([]);
    });

    test('is not shown while the unified rule creation flag is off', async ({
      apiServices,
      page,
      pageObjects,
    }) => {
      await setUnifiedRuleCreationFlag(apiServices, false);
      await page.reload();

      await pageObjects.rulesList.createRuleButton.click();

      await expect(pageObjects.rulesList.createOptionsFlyout).toBeVisible();
      await expect(pageObjects.rulesList.createRuleSearchInput).toBeHidden();
    });

    test('sends the typed text to a new side chat conversation', async ({
      llmProxy,
      page,
      pageObjects,
    }) => {
      await pageObjects.rulesList.createRuleButton.click();
      await expect(pageObjects.rulesList.createRuleSearchInput).toBeVisible();

      // Each interceptor expires 30s after it is registered, so register after the app loads.
      mockTitleGeneration(llmProxy, 'CPU alert');
      mockAgentAnswer(llmProxy, 'Sure, let us build that rule.');

      await pageObjects.rulesList.createRuleSearchInput.fill(REQUEST);
      await pageObjects.rulesList.createRuleSendToAgentButton.click();
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // The flyout closes and the conversation opens beside the rules list, not on its own page.
      await expect(pageObjects.rulesList.createOptionsFlyout).toBeHidden();
      await expect(pageObjects.agentChat.userMessageContaining(REQUEST)).toBeVisible();
      expect(new URL(page.url()).pathname).not.toContain('/agent_builder/');
    });

    test('sends the typed text with Enter when no result is highlighted', async ({
      llmProxy,
      pageObjects,
    }) => {
      await pageObjects.rulesList.createRuleButton.click();
      await expect(pageObjects.rulesList.createRuleSearchInput).toBeVisible();

      mockTitleGeneration(llmProxy, 'CPU alert');
      mockAgentAnswer(llmProxy, 'Sure, let us build that rule.');

      await pageObjects.rulesList.createRuleSearchInput.fill(REQUEST);
      await pageObjects.rulesList.createRuleSearchInput.press('Enter');
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      await expect(pageObjects.agentChat.userMessageContaining(REQUEST)).toBeVisible();
    });
  }
);
