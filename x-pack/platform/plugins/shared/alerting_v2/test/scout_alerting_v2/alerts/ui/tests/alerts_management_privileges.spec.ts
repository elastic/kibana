/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { AlertingPageObjects } from '../fixtures';
import {
  ALERTING_V2_ALERTS_ALL_ROLE,
  ALERTING_V2_ALERTS_READ_ROLE,
  buildAlertEvent,
  test,
} from '../fixtures';

const SEEDED_TAG = 'scout-alerts-mgmt-priv-v2';
const SEEDED_RULE_ID = 'scout-alerts-mgmt-priv-rule';
const SEEDED_GROUP_HASH = 'scout-alerts-mgmt-priv-group';

const assertEpisodesManagementHappyPath = async ({
  alertEpisodesList,
  alertingNavigation,
}: Pick<AlertingPageObjects, 'alertEpisodesList' | 'alertingNavigation'>): Promise<void> => {
  await test.step('page renders without the privilege prompt', async () => {
    await expect(alertEpisodesList.pageContainer).toBeVisible({ timeout: 60_000 });
    await expect(alertingNavigation.requiredPrivilegesPrompt).not.toBeVisible();
  });

  await test.step('KPI panels render successfully', async () => {
    await expect(alertEpisodesList.kpisAlertsPanel).toBeVisible();
    await expect(alertEpisodesList.kpisAlertActionsPanel).toBeVisible();
  });

  await test.step('histogram chart renders successfully', async () => {
    await expect(alertEpisodesList.histogramPanel).toBeVisible();
    await expect(alertEpisodesList.histogramChart).toBeVisible({ timeout: 30_000 });
  });

  await test.step('episodes table renders with item count', async () => {
    await expect(alertEpisodesList.tableToolbar).toBeVisible({ timeout: 60_000 });
    await expect(alertEpisodesList.itemCount).toHaveText(/^Showing(?: first)? \d[\d,]* episodes?$/);
  });

  await test.step('tags filter lists the seeded v2 tag', async () => {
    await expect(alertEpisodesList.tagsFilterButton).toBeVisible();
    await alertEpisodesList.openTagsFilter();
    await expect(alertEpisodesList.tagsFilterSearch).toBeVisible();
    await alertEpisodesList.searchTagsFilter(SEEDED_TAG);
    await expect(alertEpisodesList.tagFilterOption(SEEDED_TAG)).toBeVisible({
      timeout: 30_000,
    });
  });
};

/*
 * Covers privilege gating on the Alerts (episodes) management page. The
 * management mount uses the default v2 privilege gate (no solution-scoped
 * override), so only users with alerting_v2_alerts capabilities can access it.
 *
 * v1-only users (stackAlerts, logs) are blocked at the Kibana application
 * level — the management section is not even rendered for them — so they are
 * not tested here. The observability alerting plugin's solution-scoped mount
 * covers the v1 privilege path.
 *
 * Each privileged test asserts the full page structure: KPI panels, histogram
 * chart, episodes table item count, and tags filter all render.
 *
 * A recent active episode plus a tag action are seeded so the table toolbar
 * and tags filter mount. The `alerting_v2` Scout config set already pins
 * `alerting:v2:enabled`.
 *
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
test.describe(
  'Alerts management page - privilege-based access',
  { tag: '@local-stateful-classic' },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      test.setTimeout(180_000);
      await apiServices.alertingV2.ruleEvents.cleanUp();
      await apiServices.alertingV2.alertActionsEvents.cleanUp();
      const now = new Date().toISOString();
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          '@timestamp': now,
          rule: { id: SEEDED_RULE_ID, version: 1 },
          group_hash: SEEDED_GROUP_HASH,
          episode: { id: 'scout-alerts-mgmt-priv-episode', status: 'active' },
        }),
      ]);
      await apiServices.alertingV2.alertActionsEvents.seed([
        {
          '@timestamp': now,
          last_series_event_timestamp: now,
          actor: null,
          action_type: 'tag',
          group_hash: SEEDED_GROUP_HASH,
          rule_id: SEEDED_RULE_ID,
          tags: [SEEDED_TAG],
          space_id: 'default',
          source: 'scout-test',
        },
      ]);
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.ruleEvents.cleanUp();
      await apiServices.alertingV2.alertActionsEvents.cleanUp();
    });

    test('alerting_v2_alerts all user sees the full page', async ({ browserAuth, pageObjects }) => {
      test.setTimeout(180_000);
      await browserAuth.loginWithCustomRole(ALERTING_V2_ALERTS_ALL_ROLE);
      await pageObjects.alertEpisodesList.goto();
      await assertEpisodesManagementHappyPath(pageObjects);
    });

    test('alerting_v2_alerts read user sees the full page', async ({
      browserAuth,
      pageObjects,
    }) => {
      test.setTimeout(180_000);
      await browserAuth.loginWithCustomRole(ALERTING_V2_ALERTS_READ_ROLE);
      await pageObjects.alertEpisodesList.goto();
      await assertEpisodesManagementHappyPath(pageObjects);
    });
  }
);
