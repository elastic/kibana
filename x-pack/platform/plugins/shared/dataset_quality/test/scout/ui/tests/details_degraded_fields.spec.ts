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
  createDegradedFieldsRecord,
  deleteDataStreamIfExists,
  getLogsForDataset,
  indexLogs,
} from '../../common';

/**
 * Three fixed points inside one query window: `EARLY` seeds every degraded field,
 * `LATE` re-degrades only two of them (so `test_field` has the oldest occurrence and
 * the sort assertions are deterministic) and `REFRESHED` is ingested mid-test.
 */
const EARLY = '2024-01-01T10:00:00.000Z';
const LATE = '2024-01-01T12:00:00.000Z';
const REFRESHED = '2024-01-01T14:00:00.000Z';
const TIME_RANGE = {
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-02T00:00:00.000Z',
  refresh: { pause: true, value: 0 },
};

/** Owned by this spec, so filter and sort state cannot be perturbed elsewhere. */
const DEGRADED_DATASET = 'synth.degradedfields';
const DEGRADED_DATA_STREAM = buildDataStreamName({ dataset: DEGRADED_DATASET });
const CLEAN_DATASET = 'synth.nodegradedfields';
const CLEAN_DATA_STREAM = buildDataStreamName({ dataset: CLEAN_DATASET });

/** The fields `createDegradedFieldsRecord` pushes past `ignore_above`. */
const DEGRADED_FIELDS = ['cloud.availability_zone', 'log.level', 'test_field'];
/** Only degraded by the `EARLY` batch, so it always has the oldest occurrence. */
const OLDEST_FIELD = 'test_field';

test.describe(
  'Dataset quality details quality issues table',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await indexLogs(logsSynthtraceEsClient, [
        // Degrades log.level, test_field and cloud.availability_zone.
        createDegradedFieldsRecord({ to: EARLY, count: 1, dataset: DEGRADED_DATASET }),
        // Degrades log.level and cloud.availability_zone only.
        getLogsForDataset({
          to: LATE,
          count: 1,
          dataset: DEGRADED_DATASET,
          isMalformed: true,
        }),
        getLogsForDataset({ to: LATE, count: 4, dataset: CLEAN_DATASET }),
      ]);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient, log }) => {
      await deleteDataStreamIfExists(esClient, DEGRADED_DATA_STREAM, log);
      await deleteDataStreamIfExists(esClient, CLEAN_DATA_STREAM, log);
    });

    test('shows the no-data state when the data set has no quality issues', async ({
      pageObjects,
    }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: CLEAN_DATA_STREAM,
        timeRange: TIME_RANGE,
      });

      await expect(pageObjects.datasetQualityDetails.qualityIssuesTableNoData).toBeVisible();
    });

    test('lists every degraded field and keeps the last-occurrence sort in the URL', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: DEGRADED_DATA_STREAM,
        timeRange: TIME_RANGE,
      });

      await test.step('renders one row with a spark plot per degraded field', async () => {
        await expect(pageObjects.datasetQualityDetails.qualityIssuesTable).toBeVisible();

        await expect
          .poll(async () => (await pageObjects.datasetQualityDetails.getQualityIssueNames()).sort())
          .toStrictEqual(DEGRADED_FIELDS);

        await expect(pageObjects.datasetQualityDetails.getSparkPlots()).toHaveCount(
          DEGRADED_FIELDS.length
        );
      });

      await test.step('sorts by last occurrence descending by default', async () => {
        const names = await pageObjects.datasetQualityDetails.getQualityIssueNames();
        expect(names[names.length - 1]).toBe(OLDEST_FIELD);

        await expect
          .poll(async () => decodeURIComponent(page.url()))
          .toContain('sort:(direction:desc,field:lastOccurrence)');
      });

      await test.step('reverses the order and updates the URL when sorted ascending', async () => {
        await pageObjects.datasetQualityDetails.sortQualityIssuesBy(
          testData.QUALITY_ISSUE_COLUMNS.lastOccurrence,
          'ascending'
        );

        const names = await pageObjects.datasetQualityDetails.getQualityIssueNames();
        expect(names[0]).toBe(OLDEST_FIELD);

        await expect
          .poll(async () => decodeURIComponent(page.url()))
          .toContain('sort:(direction:asc,field:lastOccurrence)');
      });
    });

    test('filters the table by the selected issue type', async ({ pageObjects }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: DEGRADED_DATA_STREAM,
        timeRange: TIME_RANGE,
      });

      await expect(pageObjects.datasetQualityDetails.qualityIssuesTable).toBeVisible();

      await test.step('keeps rows matching the selected issue type', async () => {
        await pageObjects.datasetQualityDetails.filterForIssueTypes([testData.TEXTS.fieldIgnored]);

        const rows = await pageObjects.datasetQualityDetails.parseQualityIssuesTable();
        expect(rows).toHaveLength(DEGRADED_FIELDS.length);
        for (const row of rows) {
          expect(row[testData.QUALITY_ISSUE_COLUMNS.issue]).toBe(testData.TEXTS.fieldIgnored);
        }
      });

      // Every row in this data stream is a "Field ignored" issue, so the positive case
      // above holds even if the filter does nothing. Selecting the other issue type
      // must therefore empty the table — that is what proves the filter is applied.
      await test.step('excludes rows of every other issue type', async () => {
        await pageObjects.datasetQualityDetails.goto({
          dataStream: DEGRADED_DATA_STREAM,
          timeRange: TIME_RANGE,
        });

        await pageObjects.datasetQualityDetails.filterForIssueTypes([
          testData.TEXTS.documentsIndexingFailed,
        ]);

        await expect(pageObjects.datasetQualityDetails.qualityIssuesTableNoData).toBeVisible();
      });

      await test.step('restores every row when the issue type is deselected', async () => {
        await pageObjects.datasetQualityDetails.filterForIssueTypes([
          testData.TEXTS.documentsIndexingFailed,
        ]);

        await expect
          .poll(async () => (await pageObjects.datasetQualityDetails.getQualityIssueNames()).sort())
          .toStrictEqual(DEGRADED_FIELDS);
      });
    });

    test('filters the table by the selected field', async ({ pageObjects }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: DEGRADED_DATA_STREAM,
        timeRange: TIME_RANGE,
      });

      await expect(pageObjects.datasetQualityDetails.qualityIssuesTable).toBeVisible();

      await test.step('keeps only the selected field', async () => {
        await pageObjects.datasetQualityDetails.filterForFields([OLDEST_FIELD]);

        await expect
          .poll(async () => pageObjects.datasetQualityDetails.getQualityIssueNames())
          .toStrictEqual([OLDEST_FIELD]);
      });

      await test.step('restores every field when the field is deselected', async () => {
        await pageObjects.datasetQualityDetails.filterForFields([OLDEST_FIELD]);

        await expect
          .poll(async () => (await pageObjects.datasetQualityDetails.getQualityIssueNames()).sort())
          .toStrictEqual(DEGRADED_FIELDS);
      });
    });

    test('updates the document counts when new data is ingested and the page is refreshed', async ({
      logsSynthtraceEsClient,
      pageObjects,
    }) => {
      await pageObjects.datasetQualityDetails.goto({
        dataStream: DEGRADED_DATA_STREAM,
        timeRange: TIME_RANGE,
      });

      const documentsFor = async (field: string) => {
        const rows = await pageObjects.datasetQualityDetails.parseQualityIssuesTable();
        const row = rows.find((cells) => cells[testData.QUALITY_ISSUE_COLUMNS.name] === field);
        return parseInt(row?.[testData.QUALITY_ISSUE_COLUMNS.docsCount] ?? '', 10);
      };

      // One document from each seeded batch degrades `log.level`.
      await expect.poll(async () => documentsFor('log.level')).toBe(2);

      await logsSynthtraceEsClient.index(
        createDegradedFieldsRecord({ to: REFRESHED, count: 1, dataset: DEGRADED_DATASET })
      );

      // The details page owns its own date picker, so refresh through that one.
      await pageObjects.datasetQualityDetails.container
        .locator('[data-test-subj="querySubmitButton"]')
        .click();

      await expect.poll(async () => documentsFor('log.level')).toBe(3);
    });
  }
);
