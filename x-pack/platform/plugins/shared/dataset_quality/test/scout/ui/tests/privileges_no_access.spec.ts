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
  buildDataStreamName,
  deleteDataStreamIfExists,
  fullAccessRoleWithIndices,
  getLogsForDataset,
  noDatasetQualityAccessRole,
} from '../../common';

/** Owned by this spec, so the other privilege suites cannot disturb it. */
const DATASET = 'privno.logs';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const TO = '2024-01-01T12:00:00.000Z';

test.describe(
  'Dataset quality privileges - no access',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // Seeded with the privileged synthtrace client so the empty states below prove a
    // privilege problem rather than an empty cluster.
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.index(getLogsForDataset({ to: TO, count: 4, dataset: DATASET }));
    });

    test.afterAll(async ({ esClient, log }) => {
      await deleteDataStreamIfExists(esClient, DATA_STREAM, log);
    });

    test('shows the management landing when the user has no Data Quality privileges', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(noDatasetQualityAccessRole);

      await page.gotoApp(testData.DATA_QUALITY_APP_PATH);

      // Without the app privilege the Data Set Quality route is never registered, so the
      // management landing renders instead. `ManagementLandingPage` picks one of three
      // components from the chrome style — cards navigation, the project prompt or the
      // classic prompt — so any of them satisfies the contract. Pinning to `managementHome`
      // would assert the classic chrome rather than the behaviour, and fails on serverless.
      await expect(
        page.locator(
          '[data-test-subj="cards-navigation-page"], [data-test-subj="managementHomeSolution"], [data-test-subj="managementHome"]'
        )
      ).toBeVisible();

      // The app's own content must stay absent: this is a missing app privilege, not the
      // "cannot monitor any data set" state the sibling test covers.
      await expect(pageObjects.datasetQuality.noPrivilegesEmptyState).toBeHidden();
    });

    test('shows the no-privileges empty state when the user cannot monitor any data set', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      // App access, but not a single index privilege.
      await browserAuth.loginWithCustomRole(fullAccessRoleWithIndices([]));

      // The table is not rendered at all in this state, so the list page object's
      // `goto` (which waits for the table) cannot be used here.
      await page.gotoApp(testData.DATA_QUALITY_APP_PATH);

      await expect(pageObjects.datasetQuality.noPrivilegesEmptyState).toBeVisible();

      // Data exists and is simply invisible to this user, so the app must blame
      // privileges instead of claiming there is no data.
      await expect(pageObjects.datasetQuality.noDataEmptyState).toBeHidden();
    });
  }
);
