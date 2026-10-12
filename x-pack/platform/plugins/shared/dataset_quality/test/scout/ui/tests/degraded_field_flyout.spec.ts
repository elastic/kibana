/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import rison from '@kbn/rison';

import { test, testData } from '../fixtures';
import {
  buildDataStreamName,
  createDegradedFieldsRecord,
  deleteDataStreamIfExists,
} from '../../common';

/**
 * Fixed so the ingested documents and the query window can never drift apart. The
 * FTR suite evaluated `new Date()` at import time, which made the window depend on
 * how long the run had already been going.
 */
const TO = '2024-06-01T12:00:00.000Z';
const TIME_RANGE = {
  from: '2024-06-01T11:00:00.000Z',
  to: '2024-06-01T13:00:00.000Z',
  refresh: { pause: true, value: 60000 },
} as const;

/** Owned by this spec only, so it cannot interfere with the other flyout specs. */
const DATASET = 'synth.degraded.flyout';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const DEGRADED_FIELD = 'test_field';

/**
 * Opens the details page with a quality issue already expanded from URL state.
 *
 * TODO(https://github.com/elastic/kibana/issues/287030): collapse onto
 * `pageObjects.datasetQualityDetails.goto`, which already models this state.
 */
const gotoDetailsWithExpandedIssue = async (
  page: ScoutPage,
  { dataStream, field }: { dataStream: string; field: string }
): Promise<void> => {
  const state = {
    v: 2,
    dataStream,
    timeRange: TIME_RANGE,
    expandedQualityIssue: { name: field, type: 'degraded' },
  };

  await page.gotoApp(testData.DATA_QUALITY_DETAILS_APP_PATH, {
    params: { [testData.DATA_QUALITY_URL_STATE_KEY]: rison.encode(state) },
  });
  await page.testSubj.locator('datasetDetailsContainer').waitFor({ state: 'visible' });
};

test.describe(
  'Dataset quality details - degraded field flyout',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // Read-only data, so it is seeded once for the whole file.
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.index(
        createDegradedFieldsRecord({ to: TO, count: 2, dataset: DATASET })
      );
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient, log }) => {
      await deleteDataStreamIfExists(esClient, DATA_STREAM, log);
    });

    test('opens and closes the flyout from the row expand button', async ({ pageObjects }) => {
      const { datasetQualityDetails } = pageObjects;

      await datasetQualityDetails.goto({ dataStream: DATA_STREAM, timeRange: TIME_RANGE });

      await datasetQualityDetails.openQualityIssueFlyout(DEGRADED_FIELD);
      await expect(datasetQualityDetails.degradedFieldFlyout).toBeVisible();

      await datasetQualityDetails.closeFlyout();
      await expect(datasetQualityDetails.degradedFieldFlyout).toBeHidden();
    });

    test('opens the flyout for the field named in the URL state', async ({ page, pageObjects }) => {
      await gotoDetailsWithExpandedIssue(page, {
        dataStream: DATA_STREAM,
        field: DEGRADED_FIELD,
      });

      await expect(pageObjects.datasetQualityDetails.degradedFieldFlyout).toBeVisible();
    });

    test('opens Discover in ES|QL mode filtered on the expanded field', async ({ page }) => {
      await gotoDetailsWithExpandedIssue(page, {
        dataStream: DATA_STREAM,
        field: DEGRADED_FIELD,
      });

      // Not on the details page object: it exposes the page-level Discover link
      // (`datasetQualityDetailsLinkToDiscover`), not the flyout title link.
      await page.testSubj
        .locator('datasetQualityDetailsDegradedFieldFlyoutTitleLinkToDiscover')
        .click();

      // The link hands Discover a generated ES|QL query, so wait for the query to
      // land in the URL before reading the rest of it.
      await expect
        .poll(async () => decodeURIComponent(page.url()))
        .toContain('MV_CONTAINS(_ignored');

      const decodedUrl = decodeURIComponent(page.url());
      expect(decodedUrl).toContain('/app/discover');
      expect(decodedUrl).toContain('esql');
      expect(decodedUrl).toContain(`FROM ${DATA_STREAM}`);
      expect(decodedUrl).toContain(DEGRADED_FIELD);
    });
  }
);
