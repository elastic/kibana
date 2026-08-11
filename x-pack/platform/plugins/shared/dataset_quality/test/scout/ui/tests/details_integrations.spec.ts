/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';
import {
  PACKAGES,
  PRODUCTION_NAMESPACE,
  buildDataStreamName,
  deleteDataStreamIfExists,
  getLogsForDataset,
  indexLogs,
} from '../../common';

const TO = '2024-01-01T12:00:00.000Z';
const TIME_RANGE = {
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-02T00:00:00.000Z',
  refresh: { pause: true, value: 0 },
};

const APACHE_DATASET = 'apache.access';
const APACHE_DATA_STREAM = buildDataStreamName({
  dataset: APACHE_DATASET,
  namespace: PRODUCTION_NAMESPACE,
});

/** `fleet_server` ships no dashboards, which is what makes it useful here. */
const FLEET_SERVER_DATASET = 'fleet_server.output_health';
const FLEET_SERVER_DATA_STREAM = buildDataStreamName({ dataset: FLEET_SERVER_DATASET });

/** Owned by this spec: a data set that belongs to no integration. */
const PLAIN_DATASET = 'synth.integrations';
const PLAIN_DATA_STREAM = buildDataStreamName({ dataset: PLAIN_DATASET });

test.describe(
  'Dataset quality details integrations',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.fleet.integration.installPackage(
        PACKAGES.apache.name,
        PACKAGES.apache.version
      );
      await apiServices.fleet.integration.installPackage(
        PACKAGES.fleetServer.name,
        PACKAGES.fleetServer.version
      );

      await indexLogs(logsSynthtraceEsClient, [
        getLogsForDataset({
          to: TO,
          count: 10,
          dataset: APACHE_DATASET,
          namespace: PRODUCTION_NAMESPACE,
        }),
        getLogsForDataset({ to: TO, count: 10, dataset: FLEET_SERVER_DATASET }),
        getLogsForDataset({ to: TO, count: 4, dataset: PLAIN_DATASET }),
      ]);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ apiServices, esClient, log }) => {
      await deleteDataStreamIfExists(esClient, APACHE_DATA_STREAM, log);
      await deleteDataStreamIfExists(esClient, FLEET_SERVER_DATA_STREAM, log);
      await deleteDataStreamIfExists(esClient, PLAIN_DATA_STREAM, log);
      await apiServices.fleet.integration.delete(PACKAGES.apache.name);
      await apiServices.fleet.integration.delete(PACKAGES.fleetServer.name);
    });

    test('hides the integration rows for a data set without an integration', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: PLAIN_DATA_STREAM,
        timeRange: TIME_RANGE,
      });

      // "Last Activity" belongs to the same fields list, so its presence proves the
      // section finished loading before the integration rows are asserted missing.
      await expect(
        page.testSubj.locator('datasetQualityDetailsFieldsList-last_activity')
      ).toBeVisible();

      await expect(pageObjects.datasetQualityDetails.getIntegrationRow('integration')).toBeHidden();
      await expect(pageObjects.datasetQualityDetails.getIntegrationRow('version')).toBeHidden();
    });

    test('shows the integration rows and actions for an integration data set', async ({
      pageObjects,
    }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: APACHE_DATA_STREAM,
        timeRange: TIME_RANGE,
      });

      await test.step('names the integration and its version', async () => {
        await expect(
          pageObjects.datasetQualityDetails.getIntegrationRow('integration')
        ).toContainText(PACKAGES.apache.name);
        await expect(pageObjects.datasetQualityDetails.getIntegrationRow('version')).toContainText(
          PACKAGES.apache.version
        );
      });

      await test.step('offers all three integration actions', async () => {
        await pageObjects.datasetQualityDetails.openIntegrationActionsMenu();

        await expect(
          pageObjects.datasetQualityDetails.getIntegrationAction('Overview')
        ).toBeVisible();
        await expect(
          pageObjects.datasetQualityDetails.getIntegrationAction('Template')
        ).toBeVisible();
        await expect(
          pageObjects.datasetQualityDetails.getIntegrationAction('ViewDashboards')
        ).toBeVisible();
      });
    });

    test('hides the dashboards action and links to the overview of a package without dashboards', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: FLEET_SERVER_DATA_STREAM,
        timeRange: TIME_RANGE,
      });

      await pageObjects.datasetQualityDetails.openIntegrationActionsMenu();

      await test.step('omits the dashboards action', async () => {
        // The menu renders a skeleton entry while the dashboard list is in flight.
        await page.testSubj
          .locator('datasetQualityDetailsIntegrationActionDashboardsLoading')
          .waitFor({ state: 'detached' });

        await expect(
          pageObjects.datasetQualityDetails.getIntegrationAction('ViewDashboards')
        ).toBeHidden();
      });

      await test.step('navigates to the integration overview', async () => {
        await pageObjects.datasetQualityDetails.getIntegrationAction('Overview').click();

        await expect
          .poll(async () => new URL(page.url()).pathname)
          .toContain(`/app/integrations/detail/${PACKAGES.fleetServer.name}`);
      });
    });

    test('navigates to the index template of the integration', async ({ page, pageObjects }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: APACHE_DATA_STREAM,
        timeRange: TIME_RANGE,
      });

      await pageObjects.datasetQualityDetails.openIntegrationActionsMenu();
      await pageObjects.datasetQualityDetails.getIntegrationAction('Template').click();

      await expect
        .poll(async () => new URL(page.url()).pathname)
        .toContain(`/app/management/data/index_management/templates/logs-${APACHE_DATASET}`);
    });

    test('navigates to the selected integration dashboard', async ({ page, pageObjects }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: APACHE_DATA_STREAM,
        timeRange: TIME_RANGE,
      });

      await pageObjects.datasetQualityDetails.openIntegrationActionsMenu();
      await pageObjects.datasetQualityDetails.getIntegrationAction('ViewDashboards').click();

      const dashboardActions = page.testSubj.locator(
        'datasetQualityDetailsIntegrationActionDashboard'
      );
      await expect.poll(async () => dashboardActions.count()).toBeGreaterThan(0);

      const [dashboardTitle] = (await dashboardActions.allInnerTexts()).map((text) => text.trim());
      await dashboardActions
        .filter({ has: page.getByText(dashboardTitle, { exact: true }) })
        .click();

      await expect.poll(async () => new URL(page.url()).pathname).toContain('/app/dashboards');
      await expect(pageObjects.dashboard.getAppTitle()).toHaveText(dashboardTitle);
    });
  }
);
