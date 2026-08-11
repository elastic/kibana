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
  buildDataStreamName,
  deleteDataStreamIfExists,
  getLogsForDataset,
  indexLogs,
} from '../../common';

/** Prefixed so this spec cannot collide with the other details suites. */
const DATASET = 'synth.discover';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const DEGRADED_DATASET = 'synth.discover.degraded';
const DEGRADED_DATA_STREAM = buildDataStreamName({ dataset: DEGRADED_DATASET });

const TO = '2024-01-01T12:00:00.000Z';
const TIME_RANGE = {
  from: '2023-12-01T00:00:00.000Z',
  to: '2024-02-01T00:00:00.000Z',
  refresh: { pause: true, value: 0 },
};

test.describe(
  'Dataset quality details - Discover links',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await indexLogs(logsSynthtraceEsClient, [
        getLogsForDataset({ to: TO, count: 4, dataset: DATASET }),
        // Malformed documents give this data set degraded docs to link through to.
        getLogsForDataset({ to: TO, count: 2, dataset: DEGRADED_DATASET, isMalformed: true }),
      ]);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient, log }) => {
      await deleteDataStreamIfExists(esClient, DATA_STREAM, log);
      await deleteDataStreamIfExists(esClient, DEGRADED_DATA_STREAM, log);
    });

    test('opens the data set in Discover from the page header', async ({ page, pageObjects }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: DATA_STREAM,
        timeRange: TIME_RANGE,
      });

      // Hovering the link below first stops the Lens visualisation from raising its
      // own action icons over the header button and swallowing the click.
      await pageObjects.datasetQualityDetails.linkToDiscover.hover();
      await pageObjects.datasetQualityDetails.headerButton.click();

      await expect.poll(async () => page.url()).toContain('/app/discover');
      await expect.poll(async () => decodeURIComponent(page.url())).toContain(DATASET);
    });

    test('opens the degraded documents in Discover in ES|QL mode', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: DEGRADED_DATA_STREAM,
        timeRange: TIME_RANGE,
      });

      await pageObjects.datasetQualityDetails.linkToDiscover.hover();
      await pageObjects.datasetQualityDetails.linkToDiscover.click();

      await expect
        .poll(async () => decodeURIComponent(page.url()))
        .toContain(`FROM ${DEGRADED_DATA_STREAM}`);

      const decodedUrl = decodeURIComponent(page.url());
      expect(page.url()).toContain('/app/discover');
      expect(decodedUrl).toContain('esql');
      // The query narrows to documents that Elasticsearch had to ignore a field on.
      expect(decodedUrl).toContain('_ignored');
      expect(decodedUrl).toContain('IS NOT NULL');
    });
  }
);
