/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';
import type { EsQueryAlertState } from '../lib/es_query_alert';
import { ES_QUERY_RULE_TAG, setupEsQueryAlert, teardownEsQueryAlert } from '../lib/es_query_alert';
import {
  createConsumerVisibilityDashboard,
  deleteConsumerVisibilityDashboard,
} from '../lib/consumer_visibility_dashboard';

// The alerts-only user regressed before the `includeAlertViewableTypes` fix; the stack
// rules user exercises the pre-existing `rule` authorization path.
const CASES: Array<{ title: string; role: KibanaRole }> = [
  {
    title: 'alerts-only user (stackAlertsOnly)',
    role: testData.STACK_ALERTS_READ_DASHBOARD_ROLE,
  },
  {
    title: 'stack rules user (stackAlerts)',
    role: testData.STACK_ALERTS_ALL_DASHBOARD_ROLE,
  },
];

// The dashboard and its alerts panel are provisioned via the saved objects API so each
// test asserts only panel visibility, not the add-panel authoring flow.
test.describe(
  'Embeddable alerts table - alerts panel authorization',
  { tag: tags.stateful.classic },
  () => {
    let alertState: EsQueryAlertState;
    let dashboardId: string;

    test.beforeAll(async ({ apiServices, kbnClient }) => {
      alertState = await setupEsQueryAlert(apiServices, kbnClient);
      dashboardId = await createConsumerVisibilityDashboard(kbnClient, {
        solution: 'stack',
        tag: ES_QUERY_RULE_TAG,
        title: 'Alerts panel authorization',
      });
    });

    test.afterAll(async ({ apiServices, kbnClient }) => {
      await deleteConsumerVisibilityDashboard(kbnClient, dashboardId);
      await teardownEsQueryAlert(apiServices, alertState);
    });

    for (const { title, role } of CASES) {
      test(`${title} sees alerts in a pre-configured alerts panel`, async ({
        browserAuth,
        pageObjects,
      }) => {
        await browserAuth.loginWithCustomRole(role);

        await test.step('open the dashboard that already contains the alerts panel', async () => {
          await pageObjects.dashboard.openDashboardWithId(dashboardId);
        });

        await test.step('the panel renders the authorized alerts', async () => {
          await expect(pageObjects.embeddableAlertsTable.alertsTableLoaded).toBeVisible({
            timeout: 30_000,
          });
          await expect
            .poll(async () => pageObjects.embeddableAlertsTable.getAlertRowCount(), {
              timeout: 30_000,
            })
            .toBeGreaterThan(0);
        });
      });
    }
  }
);
