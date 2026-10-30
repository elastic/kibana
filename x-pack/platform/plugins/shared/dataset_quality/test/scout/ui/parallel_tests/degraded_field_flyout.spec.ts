/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';
import { buildDataStreamName, createDegradedFieldsRecord } from '../../common';

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
      await browserAuth.loginAsViewer();
    });

    test('opens and closes the flyout from the row expand button', async ({ pageObjects }) => {
      const { datasetQualityDetails } = pageObjects;

      await datasetQualityDetails.goto({ dataStream: DATA_STREAM, timeRange: TIME_RANGE });

      await datasetQualityDetails.openQualityIssueFlyout(DEGRADED_FIELD);
      await expect(datasetQualityDetails.degradedFieldFlyout).toBeVisible();

      await datasetQualityDetails.closeFlyout();
      await expect(datasetQualityDetails.degradedFieldFlyout).toBeHidden();
    });

    test('opens the flyout for the field named in the URL state', async ({ pageObjects }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: DATA_STREAM,
        timeRange: TIME_RANGE,
        expandedQualityIssue: { name: DEGRADED_FIELD, type: 'degraded' },
      });

      await expect(pageObjects.datasetQualityDetails.degradedFieldFlyout).toBeVisible();
    });

    test('opens Discover in ES|QL mode filtered on the expanded field', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: DATA_STREAM,
        timeRange: TIME_RANGE,
        expandedQualityIssue: { name: DEGRADED_FIELD, type: 'degraded' },
      });

      // Not on the details page object: it exposes the page-level Discover link
      // (`datasetQualityDetailsLinkToDiscover`), not the flyout title link.
      await page.getByTestId('datasetQualityDetailsDegradedFieldFlyoutTitleLinkToDiscover').click();

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
