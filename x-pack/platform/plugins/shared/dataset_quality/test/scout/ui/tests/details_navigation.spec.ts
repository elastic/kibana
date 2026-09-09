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
  getLogsForDataset,
  indexLogs,
} from '../../common';

/** Ingest and query windows are fixed so the summary KPI counts stay deterministic. */
const TO = '2024-01-01T12:00:00.000Z';
const TIME_RANGE = {
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-02T00:00:00.000Z',
  refresh: { pause: true, value: 0 },
};

/** Owned by this spec so no other suite can change the counts asserted below. */
const DATASET = 'synth.navigation';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const MISSING_DATA_STREAM = 'logs-non.existent-production';
const BREAKDOWN_FIELD = 'service.name';

test.describe(
  'Dataset quality details navigation',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ esClient, log, logsSynthtraceEsClient }) => {
      // Pre-clean the owned stream so an interrupted previous run does not double the counts.
      await deleteDataStreamIfExists(esClient, DATA_STREAM, log);

      await indexLogs(logsSynthtraceEsClient, [
        // 15 timestamps x 15 documents = 225 good docs, cycling 3 service names.
        getLogsForDataset({ to: TO, count: 15, dataset: DATASET }),
        // Exactly one malformed document, so one doc is reported as degraded.
        getLogsForDataset({ to: TO, count: 1, dataset: DATASET, isMalformed: true }),
      ]);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient, log }) => {
      await deleteDataStreamIfExists(esClient, DATA_STREAM, log);
    });

    test('opens the details page for a data set from the list page', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.datasetQuality.goto();

      await pageObjects.datasetQuality.getDetailsLink(DATA_STREAM).click();

      // The title renders the data set name; the raw data stream name sits below it.
      await expect(pageObjects.datasetQualityDetails.title).toHaveText(DATASET);
      await expect.poll(async () => page.url()).toContain(testData.DATA_QUALITY_DETAILS_APP_PATH);
    });

    test('shows an empty prompt when the data stream does not exist', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: MISSING_DATA_STREAM,
        timeRange: TIME_RANGE,
      });

      await expect(pageObjects.datasetQualityDetails.emptyPrompt).toBeVisible();
      // The prompt names the data stream that could not be resolved.
      await expect(page.testSubj.locator('datasetQualityDetailsEmptyPromptBody')).toContainText(
        MISSING_DATA_STREAM
      );
    });

    test('reflects the breakdown field in the URL', async ({ page, pageObjects }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: DATA_STREAM,
        timeRange: TIME_RANGE,
      });

      await test.step('selecting a field adds it to the URL', async () => {
        await pageObjects.datasetQualityDetails.selectBreakdownField(BREAKDOWN_FIELD);

        await expect
          .poll(async () => decodeURIComponent(page.url()))
          .toContain(`breakdownField:${BREAKDOWN_FIELD}`);
      });

      await test.step('clearing the field removes it from the URL', async () => {
        await pageObjects.datasetQualityDetails.selectBreakdownField(null);

        await expect.poll(async () => page.url()).not.toContain('breakdownField');
      });
    });

    test('renders the overview summary KPIs', async ({ pageObjects }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: DATA_STREAM,
        timeRange: TIME_RANGE,
      });

      // The KPIs are filled by several requests, so poll the whole set.
      await expect
        .poll(async () => {
          const { docsCountTotal, degradedDocs, services } =
            await pageObjects.datasetQualityDetails.getSummaryKpis();
          return { docsCountTotal, degradedDocs, services };
        })
        .toStrictEqual({ docsCountTotal: '226', degradedDocs: '1', services: '3' });

      // The Hosts KPI sums a capped terms aggregation over every entity field that
      // happens to be mapped, so only its presence is asserted here.
      const { hosts } = await pageObjects.datasetQualityDetails.getSummaryKpis();
      expect(parseInt(hosts, 10)).toBeGreaterThan(0);
    });
  }
);
