/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  ALERTING_V2_ALERTS_ALL_ROLE,
  ALERTING_V2_ALERTS_ALL_WITH_AGENT_BUILDER_READ_ROLE,
  ALL_ROLE,
  buildAlertEvent,
  test,
} from '../fixtures';

/*
 * The episode flyout "Add to chat" button is gated on Agent Builder being
 * present for the session (`capabilities.agentBuilder.show`). This suite
 * covers three role shapes on the shared scout_alerting_v2 server, where the
 * Agent Builder plugin itself stays enabled:
 *
 * - Alerting editor with no Agent Builder feature (treated as disabled)
 * - Alerts editor with Agent Builder read (`show`)
 * - Alerts editor without Agent Builder
 *
 * Runs on local stateful (classic) and Search serverless. Cloud stateful
 * (ECH) is omitted: custom-role auth is not supported there yet.
 */
test.describe(
  'Episode flyout — add to chat',
  { tag: ['@local-stateful-classic', ...tags.serverless.search] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.alertingV2.ruleEvents.cleanUp();
      // Seed a single active episode so the table has a row whose flyout we can
      // open. The default list filter is "Active" over "now-24h", so the event
      // must be recent and active.
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          '@timestamp': new Date().toISOString(),
          rule: { id: 'scout-episode-add-to-chat-rule', version: 1 },
          group_hash: 'scout-episode-add-to-chat-group',
          episode: { id: 'scout-episode-add-to-chat-ep', status: 'active' },
        }),
      ]);
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.ruleEvents.cleanUp();
    });

    test('does not show Add to chat when Agent Builder is disabled', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(ALL_ROLE);
      const { alertEpisodesList } = pageObjects;
      await alertEpisodesList.goto();
      await expect(alertEpisodesList.pageContainer).toBeVisible();

      await alertEpisodesList.openEpisodeFlyout();
      await expect(alertEpisodesList.episodeFlyout).toBeVisible();
      await expect(alertEpisodesList.episodeFlyoutCloseButton).toBeVisible();
      await expect(alertEpisodesList.episodeFlyoutAddToChatButton).toHaveCount(0);
    });

    test('shows Add to chat when Agent Builder is enabled and the user has privilege', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(ALERTING_V2_ALERTS_ALL_WITH_AGENT_BUILDER_READ_ROLE);
      const { alertEpisodesList } = pageObjects;
      await alertEpisodesList.goto();
      await expect(alertEpisodesList.pageContainer).toBeVisible();

      await alertEpisodesList.openEpisodeFlyout();
      await expect(alertEpisodesList.episodeFlyout).toBeVisible();
      await expect(alertEpisodesList.episodeFlyoutAddToChatButton).toBeVisible();
    });

    test('does not show Add to chat when Agent Builder is enabled and the user lacks privilege', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(ALERTING_V2_ALERTS_ALL_ROLE);
      const { alertEpisodesList } = pageObjects;
      await alertEpisodesList.goto();
      await expect(alertEpisodesList.pageContainer).toBeVisible();

      await alertEpisodesList.openEpisodeFlyout();
      // Positive, privilege-independent anchor: confirm the flyout actually
      // rendered before asserting Add to chat is absent, otherwise toHaveCount(0)
      // would pass even if the flyout never opened.
      await expect(alertEpisodesList.episodeFlyout).toBeVisible();
      await expect(alertEpisodesList.episodeFlyoutCloseButton).toBeVisible();
      await expect(alertEpisodesList.episodeFlyoutAddToChatButton).toHaveCount(0);
    });
  }
);
