/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, type KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

/**
 * Scoped role for Chat entry points: dashboard edit + Agent Builder show, plus
 * Actions so EmbeddableAccessBoundary can resolve LLM connectors.
 */
const dashboardChatRole: KibanaRole = {
  elasticsearch: {
    cluster: ['monitor'],
    indices: [
      {
        names: ['*'],
        privileges: ['read'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        agentBuilder: ['all'],
        dashboard_v2: ['all'],
        actions: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

test.describe(
  'Dashboard Chat entry points',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(dashboardChatRole);
      await pageObjects.dashboard.openNewDashboard();
    });

    test('prefills Chat from an empty-dashboard prompt without sending', async ({
      pageObjects,
    }) => {
      await pageObjects.dashboardChat.openFromMetricsPrompt();

      await expect(pageObjects.dashboardChat.conversationInputForm).toBeVisible();
      await expect(pageObjects.dashboardChat.conversationInputEditor).not.toHaveText('');
      await expect(pageObjects.dashboardChat.roundResponses).toHaveCount(0);
    });

    test('opens Chat from the add-panel flyout without a prefilled prompt', async ({
      pageObjects,
    }) => {
      await pageObjects.dashboard.openAddPanelFlyout();
      await pageObjects.dashboardChat.openFromAddPanelFlyout();

      await expect(pageObjects.dashboardChat.conversationInputForm).toBeVisible();
      await expect(pageObjects.dashboardChat.conversationInputEditor).toHaveText('');
      await expect(pageObjects.dashboardChat.roundResponses).toHaveCount(0);
    });
  }
);
