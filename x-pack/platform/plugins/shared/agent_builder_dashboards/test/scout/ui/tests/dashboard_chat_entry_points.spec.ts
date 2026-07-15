/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe(
  'Dashboard Chat entry points',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.dashboard.openNewDashboard();
    });

    test('prefills Chat from an empty-dashboard prompt without sending', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.dashboardChat.openFromMetricsPrompt();

      await expect(page.testSubj.locator('agentBuilderConversationInputForm')).toBeVisible();
      await expect(page.testSubj.locator('agentBuilderConversationInputEditor')).toHaveText(
        'Create a dashboard for my metrics'
      );
      await expect(page.testSubj.locator('agentBuilderRoundResponse')).toHaveCount(0);
    });

    test('prefills Chat from the add-panel flyout without sending', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.dashboard.openAddPanelFlyout();
      await pageObjects.dashboardChat.openFromAddPanelFlyout();

      await expect(page.testSubj.locator('agentBuilderConversationInputForm')).toBeVisible();
      await expect(page.testSubj.locator('agentBuilderConversationInputEditor')).toHaveText(
        'Create a time series chart to see my logs over time'
      );
      await expect(page.testSubj.locator('agentBuilderRoundResponse')).toHaveCount(0);
    });
  }
);
