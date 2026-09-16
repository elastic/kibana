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
 * Privilege gating for the Alerts management page (default v2 gate).
 * v1-only users never reach this mount; they are covered by the observability
 * plugin. Tagged @local-stateful-classic because custom-role auth is not on
 * Elastic Cloud Hosted yet.
 */
test.describe(
  'Alerts management page - privilege-based access',
  { tag: '@local-stateful-classic' },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      test.setTimeout(180_000);
      await apiServices.alertingV2.ruleEvents.cleanUp({ ruleId: SEEDED_RULE_ID });
      await apiServices.alertingV2.alertActionsEvents.cleanUp({ ruleId: SEEDED_RULE_ID });
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
      await apiServices.alertingV2.ruleEvents.cleanUp({ ruleId: SEEDED_RULE_ID });
      await apiServices.alertingV2.alertActionsEvents.cleanUp({ ruleId: SEEDED_RULE_ID });
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
