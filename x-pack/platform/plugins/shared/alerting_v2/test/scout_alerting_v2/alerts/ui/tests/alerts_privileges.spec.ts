/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  ALERTING_V2_ALERTS_ALL_ROLE,
  ALERTING_V2_ALERTS_READ_ROLE,
  buildAlertEvent,
  test,
} from '../fixtures';

/*
 * Covers the UI capability gating on the Alerts (episodes) page (PR #277710).
 * Episode row actions are rendered as UnifiedDataTable leading controls:
 * read-only users only get the read-safe "Open in Discover" action, while
 * editors get the mutating actions (resolve, ack, snooze, tag, assign, ...)
 * which collapse into the overflow actions menu.
 *
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
test.describe('Alerts page - read/write privileges', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleEvents.cleanUp();
    // Seed a single active episode so the episodes table renders a row whose
    // leading action controls we can assert against. The default list filter
    // is "Active" over "now-24h", so the event must be recent and active.
    await apiServices.alertingV2.ruleEvents.seed([
      buildAlertEvent({
        '@timestamp': new Date().toISOString(),
        rule: { id: 'scout-alerts-privileges-rule', version: 1 },
        group_hash: 'scout-alerts-privileges-group',
        episode: { id: 'scout-alerts-privileges-episode', status: 'active' },
      }),
    ]);
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleEvents.cleanUp();
  });

  test('editor sees the mutating episode actions menu', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(ALERTING_V2_ALERTS_ALL_ROLE);
    const { alertEpisodesList } = pageObjects;
    await alertEpisodesList.goto();
    await expect(alertEpisodesList.pageContainer).toBeVisible();

    await expect(alertEpisodesList.rowActionsMenuButton).toBeVisible();
  });

  test('read-only user only sees the read-safe open-in-discover action', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(ALERTING_V2_ALERTS_READ_ROLE);
    const { alertEpisodesList } = pageObjects;
    await alertEpisodesList.goto();
    await expect(alertEpisodesList.pageContainer).toBeVisible();

    await test.step('the read-safe open-in-discover control is available', async () => {
      await expect(alertEpisodesList.openInDiscoverRowControl).toBeVisible();
    });

    await test.step('the mutating actions menu is not rendered', async () => {
      await expect(alertEpisodesList.rowActionsMenuButton).toHaveCount(0);
    });
  });
});
