/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';
import type { EsQueryAlertState } from '../lib/es_query_alert';
import { setupEsQueryAlert, teardownEsQueryAlert } from '../lib/es_query_alert';

// The alerts-only user is the one that regressed before the `includeAlertAuthorized`
// fix; the stack rules user exercises the pre-existing `rule` authorization path.
const CASES: Array<{ title: string; role: KibanaRole }> = [
  {
    title: 'alerts-only user (stackAlertsOnly)',
    role: testData.STACK_ALERTS_ONLY_DASHBOARD_ROLE,
  },
  {
    title: 'stack rules user (stackAlerts)',
    role: testData.STACK_ALERTS_DASHBOARD_ROLE,
  },
];

test.describe(
  'Embeddable alerts table - add panel authorization',
  { tag: testData.DEPLOYMENT_AGNOSTIC_WITHOUT_SERVERLESS_OBS },
  () => {
    let alertState: EsQueryAlertState;

    test.beforeAll(async ({ apiServices, kbnClient }) => {
      alertState = await setupEsQueryAlert(apiServices, kbnClient);
    });

    test.afterAll(async ({ apiServices }) => {
      await teardownEsQueryAlert(apiServices, alertState);
    });

    for (const { title, role } of CASES) {
      test(`${title} can add an alerts panel and see alerts`, async ({
        browserAuth,
        pageObjects,
      }) => {
        await browserAuth.loginWithCustomRole(role);

        await test.step('open a new dashboard and the add-panel flyout', async () => {
          await pageObjects.dashboard.openNewDashboard();
          await pageObjects.dashboard.openAddPanelFlyout();
        });

        await test.step('the alerts panel option is offered', async () => {
          await expect(pageObjects.embeddableAlertsTable.addAlertsPanelAction).toBeVisible();
        });

        await test.step('configure and save the alerts panel', async () => {
          await pageObjects.embeddableAlertsTable.openConfigEditor();
          await pageObjects.embeddableAlertsTable.saveConfig();
        });

        await test.step('the panel renders the authorized alerts', async () => {
          await expect(pageObjects.embeddableAlertsTable.alertsTableLoaded).toBeVisible({
            timeout: 60_000,
          });
          await expect
            .poll(async () => pageObjects.embeddableAlertsTable.alertRowCells.count(), {
              timeout: 60_000,
            })
            .toBeGreaterThan(0);
        });
      });
    }
  }
);
