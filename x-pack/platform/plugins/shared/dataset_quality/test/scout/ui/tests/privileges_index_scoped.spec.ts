/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test, testData } from '../fixtures';
import {
  PACKAGES,
  buildDataStreamName,
  deleteDataStreamIfExists,
  ensurePackageInstalled,
  fullAccessRoleWithIndices,
  getLogsForDataset,
  indexLogs,
} from '../../common';

const TO = '2024-01-01T12:00:00.000Z';

/** Owned by this spec: `plain` is never monitorable, `monitored` is the one the mixed role grants `monitor` on. */
const PLAIN_DATASET = 'privix.plain';
const MONITORED_DATASET = 'privix.monitored';
const PLAIN_DATA_STREAM = buildDataStreamName({ dataset: PLAIN_DATASET });
const MONITORED_DATA_STREAM = buildDataStreamName({ dataset: MONITORED_DATASET });

/** The Apache integration supplies the dashboards the last scenario needs. */
const APACHE_ACCESS_DATASET = 'apache.access';
const APACHE_ACCESS_DATA_STREAM = buildDataStreamName({ dataset: APACHE_ACCESS_DATASET });

const READ_AND_METADATA = ['read', 'view_index_metadata'];

/** Only `metrics-*` is readable, so the seeded `logs-*` data is invisible to this user. */
const metricsOnlyRole = fullAccessRoleWithIndices([
  { names: ['metrics-*'], privileges: READ_AND_METADATA },
]);

const logsAndMetricsRole = fullAccessRoleWithIndices([
  { names: ['logs-*'], privileges: READ_AND_METADATA },
  { names: ['metrics-*'], privileges: READ_AND_METADATA },
]);

/** Readable logs, but `monitor` on nothing, so no data stream reports a size. */
const noMonitorableStreamRole = fullAccessRoleWithIndices([
  { names: ['logs-*'], privileges: READ_AND_METADATA },
]);

/** `monitor` on a single data set, so the table must degrade per row. */
const mixedMonitorRole = fullAccessRoleWithIndices([
  { names: ['logs-*'], privileges: READ_AND_METADATA },
  { names: [`logs-${MONITORED_DATASET}*`], privileges: ['monitor'] },
]);

/** Everything the app needs from Elasticsearch, so only Kibana privileges differ. */
const fullLogsMonitorRole = fullAccessRoleWithIndices([
  { names: ['logs-*'], privileges: [...READ_AND_METADATA, 'monitor'] },
]);

test.describe(
  'Dataset quality privileges - index scoped',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let uninstallApache: () => Promise<void>;

    const ownedDataStreams = [PLAIN_DATA_STREAM, MONITORED_DATA_STREAM, APACHE_ACCESS_DATA_STREAM];

    // Seeded once with the privileged client: each scenario varies the role, not the documents.
    test.beforeAll(async ({ apiServices, esClient, log, logsSynthtraceEsClient }) => {
      // Pre-clean owned streams so an interrupted previous run does not double the seeded docs.
      for (const dataStream of ownedDataStreams) {
        await deleteDataStreamIfExists(esClient, dataStream, log);
      }

      uninstallApache = await ensurePackageInstalled(
        apiServices.fleet.integration,
        PACKAGES.apache.name,
        PACKAGES.apache.version
      );

      await indexLogs(logsSynthtraceEsClient, [
        getLogsForDataset({ to: TO, count: 4, dataset: PLAIN_DATASET }),
        getLogsForDataset({ to: TO, count: 4, dataset: MONITORED_DATASET }),
        getLogsForDataset({ to: TO, count: 10, dataset: APACHE_ACCESS_DATASET }),
      ]);
    });

    test.afterAll(async ({ esClient, log }) => {
      for (const dataStream of ownedDataStreams) {
        await deleteDataStreamIfExists(esClient, dataStream, log);
      }
      await uninstallApache();
    });

    test('keeps the app usable for a user scoped to a single data set type', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(metricsOnlyRole);

      await pageObjects.datasetQuality.goto();

      await test.step('does not fall back to the no-privileges empty state', async () => {
        await expect(pageObjects.datasetQuality.noPrivilegesEmptyState).toBeHidden();
      });

      await test.step('hides the types filter when only one type is authorized', async () => {
        await expect(pageObjects.datasetQuality.getTypesFilter()).toBeHidden();
      });

      // We intentionally do not assert the no-data empty state here: it would require that
      // no `metrics-*` data stream exists anywhere on the (shared) cluster, which we cannot
      // guarantee. See scout-best-practices "Never assert that data is absent"; the empty
      // `metrics-*` branch is covered by unit tests instead.
    });

    test('renders the types filter for a user authorized for several types', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(logsAndMetricsRole);

      await pageObjects.datasetQuality.goto();

      await expect(pageObjects.datasetQuality.getTypesFilter()).toBeVisible();
    });

    test('hides size information when no data stream can be monitored', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(noMonitorableStreamRole);

      await pageObjects.datasetQuality.goto();

      await test.step('drops the Size column entirely', async () => {
        expect(await pageObjects.datasetQuality.getTableHeaderTexts()).not.toContain(
          testData.TABLE_COLUMNS.size
        );
      });

      await test.step('marks estimated data as unavailable', async () => {
        await expect(
          pageObjects.datasetQuality.getInsufficientPrivilegesBadge('Estimated Data')
        ).toBeVisible();
      });
    });

    test('warns per data set when only some can be monitored', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(mixedMonitorRole);

      await pageObjects.datasetQuality.goto();

      await test.step('badges only the data set without the monitor privilege', async () => {
        await expect(
          pageObjects.datasetQuality.getInsufficientPrivilegesBadge(`sizeBytes-${PLAIN_DATASET}`)
        ).toBeVisible();
        await expect(
          pageObjects.datasetQuality.getInsufficientPrivilegesBadge(
            `sizeBytes-${MONITORED_DATASET}`
          )
        ).toBeHidden();
      });

      await test.step('warns on the details page of the underprivileged data set', async () => {
        await pageObjects.datasetQualityDetails.goto({ dataStream: PLAIN_DATA_STREAM });

        // The details page renders the same badge in place of its Size KPI; the list
        // page object's helper is scoped to table cells, so match it here.
        await expect(
          page.testSubj.locator('datasetQualityInsufficientPrivileges-Size')
        ).toBeVisible();
      });
    });

    test('hides "View dashboards" from a user without dashboard access', async ({
      browserAuth,
      pageObjects,
    }) => {
      // Fully privileged in Elasticsearch and able to read integrations, so the only
      // thing missing is the Kibana dashboard privilege.
      await browserAuth.loginWithCustomRole(fullLogsMonitorRole);

      await pageObjects.datasetQualityDetails.goto({ dataStream: APACHE_ACCESS_DATA_STREAM });
      await pageObjects.datasetQualityDetails.openIntegrationActionsMenu();

      // Asserted alongside the actions that must stay available, so the check cannot
      // pass merely because the menu failed to open.
      await expect(
        pageObjects.datasetQualityDetails.getIntegrationAction('Overview')
      ).toBeVisible();
      await expect(
        pageObjects.datasetQualityDetails.getIntegrationAction('Template')
      ).toBeVisible();
      await expect(
        pageObjects.datasetQualityDetails.getIntegrationAction('ViewDashboards')
      ).toBeHidden();
    });
  }
);
