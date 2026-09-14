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
  test,
} from '../fixtures';

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
 * chart, and episodes table item count all render without error callouts.
 *
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
test.describe(
  'Alerts management page - privilege-based access',
  { tag: '@local-stateful-classic' },
  () => {
    test('alerting_v2_alerts all user sees the full page', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(ALERTING_V2_ALERTS_ALL_ROLE);
      const { alertEpisodesList, alertingNavigation } = pageObjects;
      await alertEpisodesList.goto();

      await test.step('page renders without the privilege prompt', async () => {
        await expect(alertEpisodesList.pageContainer).toBeVisible();
        await expect(alertingNavigation.requiredPrivilegesPrompt).not.toBeVisible();
      });

      await test.step('KPI panels render successfully', async () => {
        await expect(alertEpisodesList.kpisAlertsPanel).toBeVisible();
        await expect(alertEpisodesList.kpisAlertActionsPanel).toBeVisible();
      });

      await test.step('histogram chart renders successfully', async () => {
        await expect(alertEpisodesList.histogramPanel).toBeVisible();
        await expect(alertEpisodesList.histogramChart).toBeVisible();
      });

      await test.step('episodes table renders with item count', async () => {
        await expect(alertEpisodesList.itemCount).toBeVisible({ timeout: 30_000 });
        await expect(alertEpisodesList.itemCount).toContainText('Showing');
      });
    });

    test('alerting_v2_alerts read user sees the full page', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(ALERTING_V2_ALERTS_READ_ROLE);
      const { alertEpisodesList, alertingNavigation } = pageObjects;
      await alertEpisodesList.goto();

      await test.step('page renders without the privilege prompt', async () => {
        await expect(alertEpisodesList.pageContainer).toBeVisible();
        await expect(alertingNavigation.requiredPrivilegesPrompt).not.toBeVisible();
      });

      await test.step('KPI panels render successfully', async () => {
        await expect(alertEpisodesList.kpisAlertsPanel).toBeVisible();
        await expect(alertEpisodesList.kpisAlertActionsPanel).toBeVisible();
      });

      await test.step('histogram chart renders successfully', async () => {
        await expect(alertEpisodesList.histogramPanel).toBeVisible();
        await expect(alertEpisodesList.histogramChart).toBeVisible();
      });

      await test.step('episodes table renders with item count', async () => {
        await expect(alertEpisodesList.itemCount).toBeVisible({ timeout: 30_000 });
        await expect(alertEpisodesList.itemCount).toContainText('Showing');
      });
    });
  }
);
